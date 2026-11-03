from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from .models import (
    buyInvoice,
    buyInvoice_Item,
    BuyInvoicePayment,
    WasteInvoice,
    WasteInvoiceItem,
    Expense,
    ExpenseItem,
)
from rest_framework import serializers
from Persons.models import Vendor, Drivers
from Services.models import material
from Banking.models import Bank, CashBox, Imprest




MONEY_QUANT = Decimal("0.01")


def _to_money(value):
    return Decimal(str(value or 0)).quantize(
        MONEY_QUANT,
        rounding=ROUND_HALF_UP,
    )


class BuyInvoiceItemSerializer(serializers.ModelSerializer):
    invoice = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    material = serializers.PrimaryKeyRelatedField(
        queryset=material.objects.filter(is_deleted=0),
    )

    class Meta:
        model = buyInvoice_Item

        fields = [
            "id",
            "invoice",
            "material",
            "quantity",
            "unit_price",
            "discount_amount",
            "total_price",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "invoice",
            "total_price",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def validate(self, attrs):
        quantity = attrs.get("quantity", 0)
        unit_price = _to_money(
            attrs.get("unit_price"),
        )
        discount_amount = _to_money(
            attrs.get("discount_amount"),
        )

        if quantity <= 0:
            raise serializers.ValidationError({
                "quantity": (
                    "تعداد کالا باید بیشتر از صفر باشد."
                ),
            })

        if unit_price < 0:
            raise serializers.ValidationError({
                "unit_price": (
                    "قیمت واحد نمی‌تواند منفی باشد."
                ),
            })

        line_gross = (
            _to_money(quantity) * unit_price
        )

        if discount_amount < 0:
            raise serializers.ValidationError({
                "discount_amount": (
                    "تخفیف ردیف نمی‌تواند منفی باشد."
                ),
            })

        if discount_amount > line_gross:
            raise serializers.ValidationError({
                "discount_amount": (
                    "تخفیف ردیف نمی‌تواند از مبلغ "
                    "ناخالص ردیف بیشتر باشد."
                ),
            })

        return attrs


class BuyInvoiceSerializer(serializers.ModelSerializer):
    items = BuyInvoiceItemSerializer(
        many=True,
    )

    remaining_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = buyInvoice

        fields = [
            "id",
            "code",
            "reference",
            "title",
            "date",
            "expiry_date",
            "invoice_type",
            "vendor",
            "warehouse",
            "currency",
            "discount_percent",
            "discount_price",
            "tax_percent",
            "tax_value",
            "total_amount",
            "paid_amount",
            "remaining_amount",
            "payment_method",
            "payment_date",
            "description",
            "shipping_cost",
            "shipping_person",
            "additional_amount",
            "sign",
            "get_returned",
            "city",
            "accounting_document",
            "is_locked",
            "is_reversed",
            "reversed_at",
            "reversed_by",
            "warehouse_receipt",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
            "items",
        ]

        read_only_fields = [
            "id",

            # Workflow fields
            "invoice_type",
            "get_returned",

            # Calculated financial fields
            "tax_value",
            "total_amount",
            "paid_amount",
            "remaining_amount",
            "payment_date",

            # Accounting and warehouse fields
            "accounting_document",
            "warehouse_receipt",
            "is_locked",
            "is_reversed",
            "reversed_at",
            "reversed_by",

            # Audit fields
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def validate(self, attrs):
        instance = self.instance

        # ویرایش فقط برای پیش‌نویس بدون اثر مالی مجاز است.
        if instance is not None:
            is_not_draft = (
                instance.invoice_type != buyInvoice.Status.DRAFT
            )

            has_financial_effect = any([
                instance.accounting_document_id,
                instance.warehouse_receipt_id,
                instance.is_locked,
                instance.is_reversed,
                _to_money(instance.paid_amount) > 0,
                instance.get_returned,
            ])

            if is_not_draft or has_financial_effect:
                raise serializers.ValidationError(
                    "فقط فاکتور خرید پیش‌نویس و "
                    "بدون اثر مالی قابل ویرایش است."
                )

        items = attrs.get("items")

        if instance is None and not items:
            raise serializers.ValidationError({
                "items": (
                    "فاکتور خرید باید حداقل "
                    "یک ردیف کالا داشته باشد."
                ),
            })

        if (
            instance is not None
            and "items" in attrs
            and not items
        ):
            raise serializers.ValidationError({
                "items": (
                    "فاکتور خرید باید حداقل "
                    "یک ردیف کالا داشته باشد."
                ),
            })

        discount_percent = Decimal(
            str(
                attrs.get(
                    "discount_percent",
                    getattr(
                        instance,
                        "discount_percent",
                        0,
                    ),
                )
                or 0
            )
        )

        tax_percent = Decimal(
            str(
                attrs.get(
                    "tax_percent",
                    getattr(
                        instance,
                        "tax_percent",
                        0,
                    ),
                )
                or 0
            )
        )

        if (
            discount_percent < 0
            or discount_percent > 100
        ):
            raise serializers.ValidationError({
                "discount_percent": (
                    "درصد تخفیف باید بین صفر تا صد باشد."
                ),
            })

        if tax_percent < 0 or tax_percent > 100:
            raise serializers.ValidationError({
                "tax_percent": (
                    "درصد مالیات باید بین صفر تا صد باشد."
                ),
            })

        non_negative_fields = (
            "discount_price",
            "shipping_cost",
            "additional_amount",
        )

        for field_name in non_negative_fields:
            value = attrs.get(
                field_name,
                getattr(
                    instance,
                    field_name,
                    0,
                ),
            )

            if _to_money(value) < 0:
                raise serializers.ValidationError({
                    field_name: (
                        "این مقدار نمی‌تواند منفی باشد."
                    ),
                })

        return attrs

    @staticmethod
    def _line_total(item):
        if isinstance(item, dict):
            quantity = item.get(
                "quantity",
                0,
            )
            unit_price = item.get(
                "unit_price",
                0,
            )
            discount_amount = item.get(
                "discount_amount",
                0,
            )
        else:
            quantity = item.quantity
            unit_price = item.unit_price
            discount_amount = item.discount_amount

        gross_amount = (
            _to_money(quantity)
            * _to_money(unit_price)
        )

        return _to_money(
            gross_amount
            - _to_money(discount_amount)
        )

    def _calculate_totals(
        self,
        *,
        items,
        discount_percent,
        discount_price,
        tax_percent,
        shipping_cost,
        additional_amount,
    ):
        subtotal = sum(
            (
                self._line_total(item)
                for item in items
            ),
            Decimal("0.00"),
        )

        subtotal = _to_money(subtotal)

        discount_percent = Decimal(
            str(discount_percent or 0)
        )

        discount_price = _to_money(
            discount_price,
        )

        tax_percent = Decimal(
            str(tax_percent or 0)
        )

        shipping_cost = _to_money(
            shipping_cost,
        )

        additional_amount = _to_money(
            additional_amount,
        )

        minimum_percent_discount = _to_money(
            subtotal
            * discount_percent
            / Decimal("100")
        )

        # فرانت فعلی درصد تخفیف و تخفیف ثابت را
        # در discount_price با یکدیگر جمع می‌کند.
        if (
            discount_price
            < minimum_percent_discount
        ):
            raise serializers.ValidationError({
                "discount_price": (
                    "مبلغ تخفیف از تخفیف محاسبه‌شده "
                    "بر اساس درصد کمتر است."
                ),
            })

        if discount_price > subtotal:
            raise serializers.ValidationError({
                "discount_price": (
                    "مبلغ تخفیف نمی‌تواند از جمع "
                    "ردیف‌های فاکتور بیشتر باشد."
                ),
            })

        taxable_amount = _to_money(
            subtotal - discount_price,
        )

        tax_value = _to_money(
            taxable_amount
            * tax_percent
            / Decimal("100")
        )

        total_amount = _to_money(
            taxable_amount
            + tax_value
            + shipping_cost
            + additional_amount
        )

        if total_amount <= 0:
            raise serializers.ValidationError({
                "total_amount": (
                    "مبلغ نهایی فاکتور باید "
                    "بیشتر از صفر باشد."
                ),
            })

        return tax_value, total_amount

    @staticmethod
    def _actor_from_validated_data(
        validated_data,
    ):
        return (
            validated_data.get("updated_by")
            or validated_data.get("created_by")
            or "system"
        )

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop(
            "items",
        )

        actor = (
            self._actor_from_validated_data(
                validated_data,
            )
        )


        # مبلغ پرداخت‌شده فقط از Endpoint پرداخت تغییر می‌کند.
        validated_data["paid_amount"] = Decimal(
            "0.00",
        )

        tax_value, total_amount = (
            self._calculate_totals(
                items=items_data,
                discount_percent=validated_data.get(
                    "discount_percent",
                    0,
                ),
                discount_price=validated_data.get(
                    "discount_price",
                    0,
                ),
                tax_percent=validated_data.get(
                    "tax_percent",
                    0,
                ),
                shipping_cost=validated_data.get(
                    "shipping_cost",
                    0,
                ),
                additional_amount=validated_data.get(
                    "additional_amount",
                    0,
                ),
            )
        )

        validated_data["tax_value"] = tax_value
        validated_data["total_amount"] = (
            total_amount
        )

        invoice = buyInvoice.objects.create(
            **validated_data
        )

        for item_data in items_data:
            buyInvoice_Item.objects.create(
                invoice=invoice,
                created_by=actor,
                total_price=self._line_total(
                    item_data,
                ),
                **item_data,
            )

        return invoice

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

        actor = (
            self._actor_from_validated_data(
                validated_data,
            )
        )

        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value,
            )


        if items_data is not None:
            calculation_items = items_data
        else:
            calculation_items = (
                instance.items.filter(
                    is_deleted=0,
                )
            )

        tax_value, total_amount = (
            self._calculate_totals(
                items=calculation_items,
                discount_percent=(
                    instance.discount_percent
                ),
                discount_price=(
                    instance.discount_price
                ),
                tax_percent=(
                    instance.tax_percent
                ),
                shipping_cost=(
                    instance.shipping_cost
                ),
                additional_amount=(
                    instance.additional_amount
                ),
            )
        )

        instance.tax_value = tax_value
        instance.total_amount = total_amount
        instance.save()

        if items_data is not None:
            # چون ویرایش فقط روی Draft انجام می‌شود،
            # حذف فیزیکی آیتم‌ها در این مرحله امن است.
            instance.items.all().delete()

            for item_data in items_data:
                buyInvoice_Item.objects.create(
                    invoice=instance,
                    created_by=actor,
                    total_price=self._line_total(
                        item_data,
                    ),
                    **item_data,
                )

        return instance
    

class BuyInvoicePaymentSerializer(serializers.ModelSerializer):
    payer_name = serializers.SerializerMethodField()
    payer_type_label = serializers.SerializerMethodField()

    class Meta:
        model = BuyInvoicePayment
        exclude = ["is_deleted"]
        read_only_fields = [
            "accounting_document",
            "is_reversed",
            "reversed_at",
            "reversed_by",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def get_payer_type_label(self, obj):
        labels = {
            "bank": "بانک",
            "cashbox": "صندوق",
            "imprest": "تنخواه‌گردان",
            "cheque": "چک",
        }

        return labels.get(obj.payer_type, obj.payer_type)

    def get_payer_name(self, obj):
        model_map = {
            "bank": Bank,
            "cashbox": CashBox,
            "imprest": Imprest,
        }

        model = model_map.get(obj.payer_type)

        if not model:
            return None

        item = model.objects.filter(id=obj.payer_id, is_deleted=0).first()

        if not item:
            return None

        return getattr(item, "name", None) or getattr(item, "title", None) or f"#{obj.payer_id}"


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'first_name', 'last_name', 'company', 'code']


class DriversSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drivers
        fields = ['id', 'first_name', 'last_name', 'company', 'code']



class ExpenseItemSerializer(serializers.ModelSerializer):

    receiver_name = serializers.SerializerMethodField()
    receiver_type_label = serializers.SerializerMethodField()
    class Meta:
        model = ExpenseItem
        exclude = ['is_deleted']
        read_only_fields = [
            'expense',
            'payer_person_ct',
            'payer_person_object_id',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("مبلغ باید بیشتر از صفر باشد.")
        return value

    def validate_bank_fees(self, value):
        if value < 0:
            raise serializers.ValidationError("کارمزد نمی‌تواند منفی باشد.")
        return value

    def get_receiver_type_label(self, obj):
        labels = {
            "bank": "بانک",
            "cashbox": "صندوق",
            "imprest": "تنخواه‌گردان",
            "cheque": "چک",
        }

        return labels.get(obj.receiver_type, obj.receiver_type)


    def get_receiver_name(self, obj):
        model_map = {
            "bank": Bank,
            "cashbox": CashBox,
            "imprest": Imprest,
        }

        model = model_map.get(obj.receiver_type)

        if not model:
            return None

        item = model.objects.filter(
            id=obj.receiver_id,
            is_deleted=0,
        ).first()

        if not item:
            return None

        return getattr(item, "name", None)


class ExpenseSerializer(serializers.ModelSerializer):
    items = ExpenseItemSerializer(many=True)

    class Meta:
        model = Expense
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'amount': {'read_only': True},
        }
        read_only_fields = [
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "amount",
            "accounting_document",
            "is_locked",
            "is_reversed",
            "reversed_at",
            "reversed_by",
            "reverse_expense",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])

        validated_data.pop("accounting_document", None)
        validated_data.pop("is_locked", None)
        validated_data.pop("is_reversed", None)
        validated_data.pop("reverse_expense", None)

        expense = Expense.objects.create(**validated_data)

        total = 0

        for item_data in items_data:
            amount = item_data.get('amount', 0) or 0
            total += amount

            ExpenseItem.objects.create(
                expense=expense,
                payer_person_ct=expense.payer_person_ct,
                payer_person_object_id=expense.payer_person_object_id,
                created_by=expense.created_by,
                **item_data
            )

        expense.amount = total
        expense.save()

        return expense
    
    # ویرایش هزینه سنددار → سند قبلی معکوس می‌شود → موجودی بانک/صندوق/تنخواه قبلی برمی‌گردد → آیتم‌های جدید ذخیره می‌شوند → سند حسابداری جدید ساخته و قفل می‌شود.
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        instance.items.all().update(is_deleted=1)

        total = 0

        for item_data in items_data:
            amount = item_data.get("amount", 0) or 0
            total += amount

            ExpenseItem.objects.create(
                expense=instance,
                payer_person_ct=instance.payer_person_ct,
                payer_person_object_id=instance.payer_person_object_id,
                created_by=instance.created_by,
                **item_data
            )

        instance.amount = total
        instance.is_reversed = False
        instance.reversed_at = None
        instance.reversed_by = None
        instance.reverse_expense = None
        instance.save()

        return instance
    

# waste serializers
class WasteInvoiceItemSerializer(serializers.ModelSerializer):
    material = serializers.PrimaryKeyRelatedField(
        queryset=material.objects.filter(is_deleted=0),
    )

    material_name = serializers.CharField(
        source="material.persian_name",
        read_only=True,
    )

    sku_code = serializers.CharField(
        source="material.sku_code",
        read_only=True,
    )

    barcode = serializers.CharField(
        source="material.barcode",
        read_only=True,
    )

    class Meta:
        model = WasteInvoiceItem

        fields = [
            "id",
            "invoice",
            "material",
            "material_name",
            "sku_code",
            "barcode",
            "description",
            "quantity",
            "unit_price",
            "total_price",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "invoice",
            "total_price",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "تعداد ضایعات باید بیشتر از صفر باشد."
            )

        return value

    def validate_unit_price(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "قیمت واحد ضایعات باید بیشتر از صفر باشد."
            )

        return value


class WasteInvoiceSerializer(serializers.ModelSerializer):
    items = WasteInvoiceItemSerializer(
        many=True,
    )

    class Meta:
        model = WasteInvoice

        fields = [
            "id",
            "code",
            "reference",
            "date",
            "description",
            "total_quantity",
            "total_amount",
            "warehouse",
            "warehouse_receipt",
            "accounting_document",
            "is_locked",
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
            "total_quantity",
            "total_amount",
            "warehouse_receipt",
            "accounting_document",
            "is_locked",
            "is_reversed",
            "reversed_at",
            "reversed_by",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def validate(self, attrs):
        if self.instance is not None:
            raise serializers.ValidationError(
                "فاکتور ضایعات پس از ثبت قابل ویرایش نیست. "
                "برای خنثی‌کردن اثر آن از عملیات ابطال استفاده کنید."
            )

        warehouse_obj = attrs.get("warehouse")

        if not warehouse_obj:
            raise serializers.ValidationError({
                "warehouse": "انتخاب انبار خروج الزامی است.",
            })

        items = attrs.get("items") or []

        if not items:
            raise serializers.ValidationError({
                "items": (
                    "فاکتور ضایعات باید حداقل "
                    "یک ردیف کالا داشته باشد."
                ),
            })

        material_ids = [
            item["material"].id
            for item in items
        ]

        if len(material_ids) != len(set(material_ids)):
            raise serializers.ValidationError({
                "items": (
                    "هر کالا فقط یک بار می‌تواند "
                    "در فاکتور ضایعات ثبت شود."
                ),
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop(
            "items",
        )

        actor = (
            validated_data.get("created_by")
            or "system"
        )

        total_quantity = 0
        total_amount = Decimal("0.00")

        invoice = WasteInvoice.objects.create(
            total_quantity=0,
            total_amount=Decimal("0.00"),
            **validated_data,
        )

        for item_data in items_data:
            quantity = int(
                item_data["quantity"]
            )

            unit_price = _to_money(
                item_data["unit_price"]
            )

            total_price = _to_money(
                Decimal(str(quantity))
                * unit_price
            )

            WasteInvoiceItem.objects.create(
                invoice=invoice,
                total_price=total_price,
                created_by=actor,
                **item_data,
            )

            total_quantity += quantity
            total_amount += total_price

        invoice.total_quantity = total_quantity
        invoice.total_amount = _to_money(
            total_amount
        )

        invoice.save(
            update_fields=[
                "total_quantity",
                "total_amount",
            ]
        )

        return invoice

    def update(
        self,
        instance,
        validated_data,
    ):
        raise serializers.ValidationError(
            "فاکتور ضایعات پس از ثبت قابل ویرایش نیست."
        )