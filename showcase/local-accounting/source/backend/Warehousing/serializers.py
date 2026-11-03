from rest_framework import serializers
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db import transaction
from Services.models import material as Material  # نام مدل شما
from django.db.models import Sum, Case, When, F, DecimalField, Q, Value as V
from .models import (
    warehouse, inventory,
    WarehouseReceipt, WarehouseReceiptItem, StockTaking , StockTakingItem
)

from .date_utils import (
    InvalidWarehouseReceiptDate,
    parse_warehouse_receipt_date,
)


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = warehouse
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }

class InventorySerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    material_name = serializers.CharField(
        source="material.persian_name",
        read_only=True,
    )

    material_code = serializers.CharField(
        source="material.sku_code",
        read_only=True,
    )

    class Meta:
        model = inventory

        fields = [
            "id",
            "code",
            "warehouse",
            "warehouse_name",
            "material",
            "material_name",
            "material_code",
            "material_initial_inventory",
            "total",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

        read_only_fields = fields

# -------- Items of Reciepts --------
class WarehouseReceiptItemSerializer(
    serializers.ModelSerializer
):
    material = serializers.PrimaryKeyRelatedField(
        queryset=Material.objects.filter(
            is_deleted=0,
        ),
    )

    material_name = serializers.CharField(
        source="material.persian_name",
        read_only=True,
    )

    material_code = serializers.CharField(
        read_only=True,
    )

    unit = serializers.CharField(
        read_only=True,
    )

    class Meta:
        model = WarehouseReceiptItem

        fields = [
            "id",
            "receipt",
            "material",
            "material_name",
            "material_code",
            "unit",
            "quantity",
            "reference",
            "description",
        ]

        read_only_fields = [
            "id",
            "receipt",
            "material_name",
            "material_code",
            "unit",
        ]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "تعداد کالا باید بیشتر از صفر باشد."
            )

        return value


class WarehouseReceiptSerializer(
    serializers.ModelSerializer
):

    items = WarehouseReceiptItemSerializer(
        many=True,
        required=False,
    )

    from_warehouse = serializers.PrimaryKeyRelatedField(
        queryset=warehouse.objects.filter(
            is_deleted=0,
        ),
    )


    destination_warehouse = serializers.PrimaryKeyRelatedField(
        queryset=warehouse.objects.filter(
            is_deleted=0,
        ),
        required=False,
        allow_null=True,
    )


    destination_warehouse_name = serializers.CharField(
        source="destination_warehouse.name",
        read_only=True,
    )


    from_warehouse_name = serializers.CharField(
        source="from_warehouse.name",
        read_only=True,
    )


    related_party = serializers.CharField(
        source="destination_warehouse.name",
        read_only=True,
    )


    doc_type = serializers.CharField(
        source="type",
        read_only=True,
    )


    class Meta:

        model = WarehouseReceipt


        fields = [
            "id",
            "number",
            "date",
            "effective_date",
            "direction",

            "from_warehouse",
            "from_warehouse_name",

            "destination_warehouse",
            "destination_warehouse_name",

            "type",
            "doc_type",

            "related_party",

            "sales_invoice",
            "buy_invoice",

            "description",
            "transport",
            "handover",

            "status",

            "is_reversed",
            "reversed_at",
            "reversed_by",

            "created_by",
            "created_at",

            "updated_by",
            "updated_at",

            "items",
        ]



        read_only_fields = [

            "id",

            "direction",

            "doc_type",

            "related_party",

            "status",

            "is_reversed",

            "reversed_at",

            "reversed_by",

            "created_by",

            "created_at",

            "updated_by",

            "updated_at",

            "effective_date",
        ]



    def validate_number(self, value):

        if value <= 0:

            raise serializers.ValidationError(
                "شماره حواله باید بیشتر از صفر باشد."
            )

        return value

    def validate_date(self, value):
        try:
            parse_warehouse_receipt_date(value)
        except InvalidWarehouseReceiptDate as exc:
            raise serializers.ValidationError(
                str(exc)
            ) from exc

        return value
        

    def validate(self, attrs):

        instance = self.instance


        if instance is not None:


            if (
                instance.status
                != WarehouseReceipt.Status.DRAFT
            ):

                raise serializers.ValidationError(
                    "فقط حواله پیش‌نویس قابل ویرایش است."
                )


            if instance.is_reversed:

                raise serializers.ValidationError(
                    "حواله ابطال‌شده قابل ویرایش نیست."
                )


            if (
                instance.type
                != WarehouseReceipt.ReceiptType.TRANSFER
            ):

                raise serializers.ValidationError(
                    "اسناد متصل به فاکتور قابل ویرایش دستی نیستند."
                )



        from_warehouse_obj = attrs.get(
            "from_warehouse",
            getattr(
                instance,
                "from_warehouse",
                None,
            ),
        )


        destination_warehouse_obj = attrs.get(
            "destination_warehouse",
            getattr(
                instance,
                "destination_warehouse",
                None,
            ),
        )



        if not from_warehouse_obj:

            raise serializers.ValidationError({

                "from_warehouse":
                "انتخاب انبار مبدأ الزامی است."

            })



        document_type = attrs.get(
            "type",
            getattr(
                instance,
                "type",
                None,
            )
        )



        if (
            document_type
            ==
            WarehouseReceipt.ReceiptType.TRANSFER
        ):


            if not destination_warehouse_obj:

                raise serializers.ValidationError({

                    "destination_warehouse":
                    "برای انتقال، انبار مقصد الزامی است."

                })



            if (
                from_warehouse_obj.id
                ==
                destination_warehouse_obj.id
            ):

                raise serializers.ValidationError({

                    "destination_warehouse":
                    "انبار مبدأ و مقصد نمی‌توانند یکی باشند."

                })



        elif (
            document_type
            ==
            WarehouseReceipt.ReceiptType.PURCHASE_INVOICE
        ):


            if not attrs.get("buy_invoice"):

                raise serializers.ValidationError({

                    "buy_invoice":
                    "برای فاکتور خرید انتخاب سند خرید الزامی است."

                })



        elif (
            document_type
            ==
            WarehouseReceipt.ReceiptType.SALES_INVOICE
        ):


            if not attrs.get("sales_invoice"):

                raise serializers.ValidationError({

                    "sales_invoice":
                    "برای فاکتور فروش انتخاب سند فروش الزامی است."

                })



        items = attrs.get(
            "items"
        )



        if (

            instance is None

            and

            document_type
            ==
            WarehouseReceipt.ReceiptType.TRANSFER

            and

            not items

        ):

            raise serializers.ValidationError({

                "items":
                "حواله انتقال باید حداقل یک ردیف کالا داشته باشد."

            })



        if (

            instance is not None

            and

            "items" in attrs

            and

            document_type
            ==
            WarehouseReceipt.ReceiptType.TRANSFER

            and

            not items

        ):

            raise serializers.ValidationError({

                "items":
                "حواله انتقال باید حداقل یک ردیف کالا داشته باشد."

            })



        if items:


            material_ids = [

                item["material"].id

                for item in items

            ]



            if (
                len(material_ids)
                !=
                len(set(material_ids))
            ):


                raise serializers.ValidationError({

                    "items":
                    "هر کالا فقط یک‌بار در حواله قابل ثبت است."

                })



        return attrs





    @staticmethod
    def _create_items(
        receipt,
        items_data,
    ):


        for item_data in items_data:


            material_obj = item_data.pop(
                "material"
            )



            WarehouseReceiptItem.objects.create(

                receipt=receipt,

                material=material_obj,


                material_code=str(

                    getattr(
                        material_obj,
                        "sku_code",
                        "",
                    )

                    or

                    material_obj.id

                ),


                unit=(

                    getattr(
                        material_obj,
                        "main_currency",
                        None,
                    )

                    or

                    "عدد"

                ),


                **item_data,

            )





    @transaction.atomic
    def create(
        self,
        validated_data,
    ):


        items_data = validated_data.pop(
            "items",
            [],
        )



        receipt_type = validated_data.get(
            "type"
        )



        if receipt_type == WarehouseReceipt.ReceiptType.TRANSFER:


            validated_data["direction"] = (
                WarehouseReceipt.Direction.OUT
            )


            validated_data["status"] = (
                WarehouseReceipt.Status.DRAFT
            )



        elif receipt_type == WarehouseReceipt.ReceiptType.SALES_INVOICE:
            invoice = validated_data.get("sales_invoice")
            if not invoice:
                raise serializers.ValidationError({
                    "sales_invoice": "انتخاب فاکتور فروش الزامی است."
                })

            if invoice.warehouse_receipt_id:
                raise serializers.ValidationError({
                    "sales_invoice": "برای این فاکتور فروش قبلاً حواله انبار ثبت شده است."
                })

            if invoice.is_reversed:
                raise serializers.ValidationError({
                    "sales_invoice": "فاکتور فروش ابطال‌شده قابل اتصال به حواله جدید نیست."
                })

            selected_warehouse = validated_data.get("from_warehouse")
            if invoice.warehouse_id != selected_warehouse.id:
                raise serializers.ValidationError({
                    "from_warehouse": "انبار حواله باید با انبار خروج فاکتور فروش یکسان باشد."
                })

            from Incomes.services import create_sales_warehouse_receipt

            try:
                return create_sales_warehouse_receipt(
                    invoice=invoice,
                    user=validated_data.get("created_by"),
                    receipt_overrides={
                        "number": validated_data.get("number"),
                        "date": validated_data.get("date"),
                        "description": validated_data.get("description"),
                        "transport": validated_data.get("transport"),
                        "handover": validated_data.get("handover"),
                    },
                )
            except ValueError as exc:
                raise serializers.ValidationError({"detail": str(exc)}) from exc


        elif receipt_type == WarehouseReceipt.ReceiptType.PURCHASE_INVOICE:
            invoice = validated_data.get("buy_invoice")
            if not invoice:
                raise serializers.ValidationError({
                    "buy_invoice": "انتخاب فاکتور خرید الزامی است."
                })

            if invoice.warehouse_receipt_id:
                raise serializers.ValidationError({
                    "buy_invoice": "برای این فاکتور خرید قبلاً رسید انبار ثبت شده است."
                })

            if invoice.is_reversed:
                raise serializers.ValidationError({
                    "buy_invoice": "فاکتور خرید ابطال‌شده قابل اتصال به رسید جدید نیست."
                })

            selected_warehouse = validated_data.get("from_warehouse")
            if invoice.warehouse_id != selected_warehouse.id:
                raise serializers.ValidationError({
                    "from_warehouse": "انبار رسید باید با انبار مقصد فاکتور خرید یکسان باشد."
                })

            from Costs.services import create_purchase_warehouse_receipt

            try:
                return create_purchase_warehouse_receipt(
                    invoice=invoice,
                    user=validated_data.get("created_by"),
                    receipt_overrides={
                        "number": validated_data.get("number"),
                        "date": validated_data.get("date"),
                        "description": validated_data.get("description"),
                        "transport": validated_data.get("transport"),
                        "handover": validated_data.get("handover"),
                    },
                )
            except ValueError as exc:
                raise serializers.ValidationError({"detail": str(exc)}) from exc



        elif receipt_type == WarehouseReceipt.ReceiptType.WASTE:


            validated_data["direction"] = (
                WarehouseReceipt.Direction.OUT
            )


            validated_data["status"] = (
                WarehouseReceipt.Status.COMPLETE
            )



        elif receipt_type in [

            WarehouseReceipt.ReceiptType.SALES_RETURN,

            WarehouseReceipt.ReceiptType.PURCHASE_RETURN,

        ]:


            validated_data["direction"] = (
                WarehouseReceipt.Direction.IN
            )


            validated_data["status"] = (
                WarehouseReceipt.Status.COMPLETE
            )



        else:

            raise serializers.ValidationError(
                "نوع سند معتبر نیست."
            )



        validated_data["is_reversed"] = False



        receipt = WarehouseReceipt.objects.create(
            **validated_data
        )



        if (
            receipt_type
            ==
            WarehouseReceipt.ReceiptType.TRANSFER
        ):

            self._create_items(
                receipt,
                items_data,
            )



        return receipt






    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):


        items_data = validated_data.pop(
            "items",
            None,
        )



        editable_fields = [

            "number",

            "date",

            "from_warehouse",

            "destination_warehouse",

            "description",

            "transport",
            "handover",

            "updated_by",

            "updated_at",

        ]



        for field_name in editable_fields:


            if field_name in validated_data:

                setattr(
                    instance,
                    field_name,
                    validated_data[field_name],
                )



        instance.save()



        if items_data is not None:


            if (
                instance.type
                != WarehouseReceipt.ReceiptType.TRANSFER
            ):

                raise serializers.ValidationError(
                    "اسناد متصل به فاکتور قابل تغییر دستی نیستند."
                )



            instance.items.all().delete()



            self._create_items(
                instance,
                items_data,
            )



        return instance


# --------- گزارش موجودی ---------
class InventoryReportRowSerializer(serializers.Serializer):
    material_id = serializers.IntegerField()
    sku_code = serializers.CharField()
    barcode = serializers.IntegerField()
    persian_name = serializers.CharField()
    group_name = serializers.CharField(allow_null=True)
    category_name = serializers.CharField(allow_null=True)
    brand_name = serializers.CharField(allow_null=True)

    unit_buying_price = serializers.IntegerField()
    unit_selling_price = serializers.IntegerField()

    warehouse_id = serializers.IntegerField(allow_null=True)
    warehouse_name = serializers.CharField(allow_null=True)

    opening_qty = serializers.DecimalField(max_digits=14, decimal_places=3)
    increased_qty = serializers.DecimalField(max_digits=14, decimal_places=3)
    decreased_qty = serializers.DecimalField(max_digits=14, decimal_places=3)
    on_hand = serializers.DecimalField(max_digits=14, decimal_places=3)
    
# موجودی تمام انبار ها 
class AllWH_WarehouseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()

class AllWH_RowSerializer(serializers.Serializer):
    # مشخصات کالا
    material_id = serializers.IntegerField()
    sku_code = serializers.CharField(allow_null=True)
    barcode = serializers.CharField(allow_null=True)
    persian_name = serializers.CharField()
    group_name = serializers.CharField(allow_null=True)
    category_name = serializers.CharField(allow_null=True)
    brand_name = serializers.CharField(allow_null=True)
    unit_name = serializers.CharField(allow_null=True)

    # کنترل نقطه سفارش
    reorder_point = serializers.DecimalField(max_digits=20, decimal_places=3, required=False)
    below_reorder = serializers.BooleanField()

    # حسابداری (نمایش کلی)
    total_on_hand = serializers.DecimalField(max_digits=20, decimal_places=3)
    on_order = serializers.DecimalField(max_digits=20, decimal_places=3)  # اگر نداری 0 برمی‌گردونیم

    # موجودی منفی؟
    has_negative = serializers.BooleanField()

    # مقادیر هر انبار
    warehouses = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField(), allow_empty=True)
    )

    # اختلاف تعداد (مثلا از انبارگردانی؛ اگر نداری 0)
    diff_count = serializers.DecimalField(max_digits=20, decimal_places=3)





class StockTakingItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = StockTakingItem
        fields = "__all__"
        read_only_fields = ["stocktaking", "created_at"]


class StockTakingSerializer(serializers.ModelSerializer):
    items = StockTakingItemSerializer(
        many=True,
        required=False,
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    class Meta:
        model = StockTaking
        exclude = ["is_deleted"]
        extra_kwargs = {
            "status": {"read_only": True},
            "created_by": {"read_only": True},
            "updated_by": {"read_only": True},
            "created_at": {"read_only": True},
            "updated_at": {"read_only": True},
        }

    def validate(self, attrs):
        if (
            self.instance
            and self.instance.status
            == StockTaking.Status.FINISHED
        ):
            raise serializers.ValidationError(
                "انبارگردانی پایان‌یافته قابل ویرایش نیست."
            )

        warehouse_obj = (
            attrs.get("warehouse")
            or getattr(
                self.instance,
                "warehouse",
                None,
            )
        )

        if not self.instance and warehouse_obj:
            exists = StockTaking.objects.filter(
                warehouse=warehouse_obj,
                status=StockTaking.Status.IN_PROGRESS,
                is_deleted=0,
            ).exists()

            if exists:
                raise serializers.ValidationError({
                    "warehouse": (
                        "برای این انبار یک انبارگردانی "
                        "در جریان وجود دارد."
                    )
                })

        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop(
            "items",
            None,
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if items_data is not None:
            for item_data in items_data:
                item_data = dict(item_data)
                item_id = item_data.pop("id", None)

                if item_id:
                    stocktaking_item = (
                        StockTakingItem.objects
                        .select_for_update()
                        .filter(
                            id=item_id,
                            stocktaking=instance,
                        )
                        .first()
                    )

                    if not stocktaking_item:
                        raise serializers.ValidationError(
                            "آیتم انبارگردانی معتبر نیست."
                        )

                    for attr, value in item_data.items():
                        setattr(
                            stocktaking_item,
                            attr,
                            value,
                        )

                    stocktaking_item.save()
                else:
                    StockTakingItem.objects.create(
                        stocktaking=instance,
                        **item_data,
                    )

        return instance