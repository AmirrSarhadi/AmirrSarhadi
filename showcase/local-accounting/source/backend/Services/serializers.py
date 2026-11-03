from rest_framework import serializers
from .models import material, material_brand, material_category, material_group, MaterialDiscount, services, services_category, MaterialSellingPrice
from Warehousing.models import inventory
from Warehousing.utils import make_inventory_code
from Persons.models import Vendor
from Warehousing.models import warehouse
import base64
from io import BytesIO
from django.core.files.base import ContentFile
from PIL import Image
import uuid
from django.utils import timezone
import jdatetime
import json
from django.db import transaction
from decimal import Decimal, InvalidOperation
# static function to use and convert date to jalali persian date 
def to_jalali(dt):
    if not dt:
        return None
    # dt is aware → convert to Tehran, then to Jalali string
    tehran = timezone.localtime(dt, timezone.get_fixed_timezone(210))  # 210 = +03:30
    jd = jdatetime.datetime.fromgregorian(datetime=tehran)
    return jd.strftime("%Y/%m/%d %H:%M")


class JSONListField(serializers.ListField):

    def to_internal_value(self, data):

        # multipart/form-data sometimes sends:
        # ['[{"warehouse_id":1,"material_initial_inventory":1}]']

        if isinstance(data, list) and len(data) == 1 and isinstance(data[0], str):
            try:
                data = json.loads(data[0])
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError(
                    "ساختار لیست ارسالی معتبر نیست."
                ) from exc

        elif isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError(
                    "ساختار لیست ارسالی معتبر نیست."
                ) from exc

        return super().to_internal_value(data)
    

class MaterialDiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialDiscount
        exclude = ['is_deleted']  # still hidden
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }


class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = inventory
        fields = ['warehouse', 'material_initial_inventory', 'total']


class MaterialSellingPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialSellingPrice
        fields = ['id', 'level', 'price']


class MaterialSerializer(serializers.ModelSerializer):
    initial_inventories = serializers.SerializerMethodField(read_only=True)
    selling_prices = JSONListField(child=MaterialSellingPriceSerializer(), required=False)
    discounts = JSONListField(child=MaterialDiscountSerializer(), required=False)
    warehouses = JSONListField(
        write_only=True,
        required=False
    )

    created_at_jalali = serializers.SerializerMethodField(read_only=True)
    updated_at_jalali = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = material
        exclude = ['is_deleted']  # still hidden
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True , 'required' : False},
        }

    # ----- Jalali presenters
    def get_created_at_jalali(self, obj):
        return to_jalali(obj.created_at)

    def get_updated_at_jalali(self, obj):
        return to_jalali(obj.updated_at)

    def get_initial_inventories(self, obj):
        return [
            {
                "warehouse_id": inv.warehouse_id,
                "warehouse_name": inv.warehouse.name,
                "material_initial_inventory": inv.material_initial_inventory,
                "total": inv.total,
            }
            for inv in obj.inventories.filter(is_deleted=0).select_related("warehouse")
        ]

    def _get_actor(self):
        request = self.context.get('request')

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError({
                'detail': 'کاربر احراز هویت نشده است.'
            })

        return request.user

    def _get_inventory_values(self, data):
        try:
            warehouse_id = int(data['warehouse_id'])
            initial = Decimal(
                str(data['material_initial_inventory'])
            )
        except (KeyError, TypeError, ValueError, InvalidOperation):
            raise serializers.ValidationError({
                'warehouses': 'اطلاعات انبار یا موجودی اولیه نامعتبر است.'
            })

        if initial < 0:
            raise serializers.ValidationError({
                'warehouses': 'موجودی اولیه نمی‌تواند منفی باشد.'
            })

        if not warehouse.objects.filter(
            pk=warehouse_id,
            is_deleted=0,
        ).exists():
            raise serializers.ValidationError({
                'warehouses': 'انبار انتخاب‌شده معتبر نیست.'
            })

        return warehouse_id, initial

    @transaction.atomic
    def create(self, validated_data):
        actor = self._get_actor()

        discounts_data = validated_data.pop('discounts', [])
        warehouse_data = validated_data.pop('warehouses', [])
        selling_prices_data = validated_data.pop(
            'selling_prices',
            []
        )

        mat = material.objects.create(
            created_by=actor,
            **validated_data
        )

        for sp in selling_prices_data:
            MaterialSellingPrice.objects.create(
                material=mat,
                level=sp['level'],
                price=sp['price']
            )

        for disc in discounts_data:
            disc.pop('material', None)

            MaterialDiscount.objects.create(
                material=mat,
                created_by=actor,
                **disc
            )

        for inv in warehouse_data:
            warehouse_id, init_inv = self._get_inventory_values(inv)

            inventory.objects.create(
                code=make_inventory_code(warehouse_id, mat.id),
                warehouse_id=warehouse_id,
                material=mat,
                material_initial_inventory=init_inv,
                total=init_inv,
                created_by=actor,
                updated_by=None,
            )

        return mat

    @transaction.atomic
    def update(self, instance, validated_data):
        actor = self._get_actor()
        missing = serializers.empty

        discounts_data = validated_data.pop(
            'discounts',
            missing
        )
        warehouse_data = validated_data.pop(
            'warehouses',
            missing
        )
        selling_prices_data = validated_data.pop(
            'selling_prices',
            missing
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.updated_by = actor
        instance.save()

        if discounts_data is not missing:
            instance.discounts.all().delete()

            for disc in discounts_data:
                disc.pop('material', None)

                MaterialDiscount.objects.create(
                    material=instance,
                    created_by=actor,
                    **disc
                )

        if warehouse_data is not missing:
            for inv in warehouse_data:
                warehouse_id, init_inv = (
                    self._get_inventory_values(inv)
                )

                current = inventory.objects.filter(
                    material=instance,
                    warehouse_id=warehouse_id,
                    is_deleted=0,
                ).first()

                if current:
                    if (
                        current.material_initial_inventory
                        != init_inv
                    ):
                        raise serializers.ValidationError({
                            'warehouses': (
                                'تغییر موجودی اولیه پس از ایجاد کالا '
                                'مجاز نیست.'
                            )
                        })

                    continue

                inventory.objects.create(
                    code=make_inventory_code(warehouse_id, instance.id),
                    warehouse_id=warehouse_id,
                    material=instance,
                    material_initial_inventory=init_inv,
                    total=init_inv,
                    created_by=actor,
                )

        if selling_prices_data is not missing:
            instance.selling_prices.all().delete()

            for sp in selling_prices_data:
                MaterialSellingPrice.objects.create(
                    material=instance,
                    level=sp['level'],
                    price=sp['price']
                )

        return instance
    
    def perform_destroy(self, instance):
        """
        This method will soft-delete the material, and also delete/soft-delete related records.
        """
        # Soft delete the material by setting is_deleted flag to True
        instance.is_deleted = True
        instance.save()

        # Soft delete related inventory records
        inventory.objects.filter(material_id=instance).update(is_deleted=True)

        # Soft delete related discounts
        MaterialDiscount.objects.filter(material_id=instance).update(is_deleted=True)

        return instance

    def delete(self, instance):
        self.perform_destroy(instance)
    
class NameIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = None
        fields = ['id', 'name']

class VendorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = ['id', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = warehouse
        fields = ['id', 'name']




#______SERVICES SERIALIZER_____        

class ServicesSerializer(serializers.ModelSerializer):
    selling_tax_type_display = serializers.CharField(
        source="get_selling_tax_type_display", read_only=True
    )
    selling_tax_unit_display = serializers.CharField(
        source="get_selling_tax_unit_display", read_only=True
    )
    category_name = serializers.CharField(
        source="services_category_name.name", read_only=True
    )

    class Meta:
        model = services
        exclude = ["is_deleted"]
        extra_kwargs = {
            "created_by": {"read_only": True},
            "updated_by": {"read_only": True},
            "created_at": {"read_only": True},
            "updated_at": {"read_only": True},
        }

    def validate(self, attrs):
        selling_price = attrs.get(
            "service_selling_price",
            getattr(self.instance, "service_selling_price", 0),
        )
        buying_price = attrs.get(
            "service_buying_price",
            getattr(self.instance, "service_buying_price", 0),
        )
        selling_tax_value = attrs.get(
            "selling_tax_value",
            getattr(self.instance, "selling_tax_value", 0),
        ) or 0
        buying_tax_value = attrs.get(
            "buying_tax_value",
            getattr(self.instance, "buying_tax_value", 0),
        ) or 0

        if selling_price is not None and selling_price < 0:
            raise serializers.ValidationError({
                "service_selling_price": "قیمت فروش نمی‌تواند منفی باشد."
            })
        if buying_price is not None and buying_price < 0:
            raise serializers.ValidationError({
                "service_buying_price": "قیمت خرید نمی‌تواند منفی باشد."
            })
        if selling_tax_value < 0 or buying_tax_value < 0:
            raise serializers.ValidationError(
                "مبلغ مالیات نمی‌تواند منفی باشد."
            )

        selling_tax = attrs.get(
            "selling_tax", getattr(self.instance, "selling_tax", False)
        )
        buying_tax = attrs.get(
            "buying_tax", getattr(self.instance, "buying_tax", False)
        )
        if not selling_tax:
            attrs["selling_tax_value"] = 0
        if not buying_tax:
            attrs["buying_tax_value"] = 0

        return attrs


class ServicesCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = services_category
        exclude = ['is_deleted']  # hidden completely
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }

