from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from .models import (
    salesInvoice,
    salesInvoice_Item,
    IncomeDiscount,
    Income,
    IncomeItem,
    SalesInvoicePayment,
    InstallmentContract,
    InstallmentSchedule,
    InstallmentPayment,
)
from Persons.models import Customer,Drivers,Seller
from Services.models import material
import jdatetime
from Banking.models import Bank, CashBox, Imprest

# ---- Nested item serializer ----
def _to_money(value):
    try:
        return Decimal(str(value or 0)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        raise serializers.ValidationError("مقدار مالی نامعتبر است.")


class SalesInvoiceItemSerializer(serializers.ModelSerializer):
    invoice = serializers.PrimaryKeyRelatedField(read_only=True)
    material = serializers.PrimaryKeyRelatedField(
        queryset=material.objects.filter(is_deleted=0)
    )

    class Meta:
        model = salesInvoice_Item
        exclude = ['is_deleted']
        read_only_fields = [
            "unit_cost_snapshot",
            'invoice',
            'total_price',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
        ]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("تعداد کالا باید بیشتر از صفر باشد.")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("قیمت واحد نمی‌تواند منفی باشد.")
        return value

    def validate_discount_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("تخفیف ردیف نمی‌تواند منفی باشد.")
        return value


# ---- Main invoice serializer ----
class SalesInvoiceSerializer(serializers.ModelSerializer):
    items = SalesInvoiceItemSerializer(many=True)
    installment_contract_id = serializers.SerializerMethodField()
    has_active_installment_contract = serializers.SerializerMethodField()
    remaining_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = salesInvoice
        exclude = ['is_deleted']
        read_only_fields = [
            'invoice_type',
            'get_returned',
            'tax_value',
            'total_amount',
            'paid_amount',
            'remaining_amount',
            'payment_date',
            'accounting_document',
            'payment_document',
            'warehouse_receipt',
            'is_locked',
            'is_reversed',
            'reversed_at',
            'reversed_by',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
        ]

    def get_installment_contract_id(self, obj):
        contract = getattr(obj, "installment_contract", None)
        return contract.id if contract and contract.is_deleted == 0 else None

    def get_has_active_installment_contract(self, obj):
        contract = getattr(obj, "installment_contract", None)
        return bool(contract and contract.is_deleted == 0 and contract.status == "ACTIVE")

    @staticmethod
    def _line_total(item):
        if isinstance(item, dict):
            quantity = item.get('quantity', 0)
            unit_price = item.get('unit_price', 0)
            discount_amount = item.get('discount_amount', 0)
        else:
            quantity = item.quantity
            unit_price = item.unit_price
            discount_amount = item.discount_amount

        gross = _to_money(quantity) * _to_money(unit_price)
        discount = _to_money(discount_amount)

        if discount > gross:
            raise serializers.ValidationError({
                'items': 'تخفیف ردیف نمی‌تواند از مبلغ ناخالص ردیف بیشتر باشد.'
            })

        return _to_money(gross - discount)

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
        subtotal = _to_money(sum(
            (self._line_total(item) for item in items),
            Decimal('0.00'),
        ))

        discount_percent = Decimal(str(discount_percent or 0))
        discount_price = _to_money(discount_price)
        tax_percent = Decimal(str(tax_percent or 0))
        shipping_cost = _to_money(shipping_cost)
        additional_amount = _to_money(additional_amount)

        minimum_percent_discount = _to_money(
            subtotal * discount_percent / Decimal('100')
        )

        # Front combines percentage + fixed discount into discount_price.
        if discount_price < minimum_percent_discount:
            raise serializers.ValidationError({
                'discount_price': (
                    'مبلغ تخفیف از تخفیف محاسبه‌شده بر اساس درصد کمتر است.'
                )
            })

        if discount_price > subtotal:
            raise serializers.ValidationError({
                'discount_price': 'مبلغ تخفیف نمی‌تواند از جمع ردیف‌های فاکتور بیشتر باشد.'
            })

        taxable_amount = _to_money(subtotal - discount_price)
        tax_value = _to_money(
            taxable_amount * tax_percent / Decimal('100')
        )
        total_amount = _to_money(
            taxable_amount + tax_value + shipping_cost + additional_amount
        )

        if total_amount <= 0:
            raise serializers.ValidationError({
                'total_amount': 'مبلغ نهایی فاکتور باید بیشتر از صفر باشد.'
            })

        return tax_value, total_amount

    def validate(self, attrs):
        instance = self.instance

        if instance is not None:
            has_financial_effect = any([
                instance.accounting_document_id,
                instance.warehouse_receipt_id,
                instance.is_locked,
                instance.is_reversed,
                _to_money(instance.paid_amount) > 0,
                instance.get_returned,
            ])
            if instance.invoice_type != 'پیش نویس' or has_financial_effect:
                raise serializers.ValidationError(
                    'فقط فاکتور فروش پیش‌نویس و بدون اثر مالی قابل ویرایش است.'
                )

        items = attrs.get('items')
        if instance is None and not items:
            raise serializers.ValidationError({
                'items': 'فاکتور فروش باید حداقل یک ردیف کالا داشته باشد.'
            })
        if instance is not None and 'items' in attrs and not items:
            raise serializers.ValidationError({
                'items': 'فاکتور فروش باید حداقل یک ردیف کالا داشته باشد.'
            })

        discount_percent = Decimal(str(
            attrs.get('discount_percent', getattr(instance, 'discount_percent', 0)) or 0
        ))
        tax_percent = Decimal(str(
            attrs.get('tax_percent', getattr(instance, 'tax_percent', 0)) or 0
        ))

        if discount_percent < 0 or discount_percent > 100:
            raise serializers.ValidationError({
                'discount_percent': 'درصد تخفیف باید بین صفر تا صد باشد.'
            })
        if tax_percent < 0 or tax_percent > 100:
            raise serializers.ValidationError({
                'tax_percent': 'درصد مالیات باید بین صفر تا صد باشد.'
            })

        for field_name in ('discount_price', 'shipping_cost', 'additional_amount'):
            value = attrs.get(field_name, getattr(instance, field_name, 0))
            if _to_money(value) < 0:
                raise serializers.ValidationError({
                    field_name: 'این مقدار نمی‌تواند منفی باشد.'
                })

        return attrs

    @staticmethod
    def _actor_from_validated_data(validated_data):
        return (
            validated_data.get('updated_by')
            or validated_data.get('created_by')
            or None
        )

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        actor = self._actor_from_validated_data(validated_data)

        validated_data['paid_amount'] = Decimal('0.00')

        tax_value, total_amount = self._calculate_totals(
            items=items_data,
            discount_percent=validated_data.get('discount_percent', 0),
            discount_price=validated_data.get('discount_price', 0),
            tax_percent=validated_data.get('tax_percent', 0),
            shipping_cost=validated_data.get('shipping_cost', 0),
            additional_amount=validated_data.get('additional_amount', 0),
        )
        validated_data['tax_value'] = tax_value
        validated_data['total_amount'] = total_amount

        invoice = salesInvoice.objects.create(**validated_data)

        for item_data in items_data:
            salesInvoice_Item.objects.create(
                invoice=invoice,
                created_by=actor,
                total_price=self._line_total(item_data),
                **item_data,
            )

        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        actor = self._actor_from_validated_data(validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        calculation_items = (
            items_data
            if items_data is not None
            else instance.items.filter(is_deleted=0)
        )

        tax_value, total_amount = self._calculate_totals(
            items=calculation_items,
            discount_percent=instance.discount_percent,
            discount_price=instance.discount_price,
            tax_percent=instance.tax_percent,
            shipping_cost=instance.shipping_cost,
            additional_amount=instance.additional_amount,
        )
        instance.tax_value = tax_value
        instance.total_amount = total_amount
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                salesInvoice_Item.objects.create(
                    invoice=instance,
                    created_by=actor,
                    total_price=self._line_total(item_data),
                    **item_data,
                )

        return instance

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'first_name', 'last_name', 'code']


class SellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        fields = ['id', 'first_name', 'last_name', 'code']


class DriversSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drivers
        fields = ['id', 'first_name', 'last_name', 'code']


class SalesInvoicePaymentSerializer(serializers.ModelSerializer):
    receiver_name = serializers.SerializerMethodField()
    receiver_type_label = serializers.SerializerMethodField()
    installment_payment_id = serializers.SerializerMethodField()
    installment_contract_id = serializers.SerializerMethodField()

    class Meta:
        model = SalesInvoicePayment
        exclude = ["is_deleted"]
        read_only_fields = [
            "request_key", "request_hash",
            "accounting_document",
            "is_reversed",
            "reversed_at",
            "reversed_by",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
        ]

    def get_installment_payment_id(self, obj):
        receipt = getattr(obj, "installment_payment", None)
        return receipt.id if receipt and receipt.is_deleted == 0 else None

    def get_installment_contract_id(self, obj):
        receipt = getattr(obj, "installment_payment", None)
        if not receipt or receipt.is_deleted != 0:
            return None
        return receipt.installment.contract_id

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

        item = model.objects.filter(id=obj.receiver_id, is_deleted=0).first()
        if not item:
            return None

        return getattr(item, "name", None) or getattr(item, "title", None) or f"#{obj.receiver_id}"
        

class IncomeDiscountSerializer(serializers.ModelSerializer):
        class Meta:
            model = IncomeDiscount
            exclude = ['is_deleted']
            extra_kwargs = {
                'created_by': {'read_only': True},
                'updated_by': {'read_only': True},
                'created_at': {'read_only': True},
                'updated_at': {'read_only': True},
            }


class IncomeItemSerializer(serializers.ModelSerializer):

    receiver_name = serializers.SerializerMethodField()
    receiver_type_label = serializers.SerializerMethodField()

    class Meta:
        model = IncomeItem
        exclude = ['is_deleted']
        read_only_fields = [
            'income',
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


class IncomeSerializer(serializers.ModelSerializer):
    items = IncomeItemSerializer(many=True)

    class Meta:
        model = Income
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
            "reverse_income",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])

        income = Income.objects.create(**validated_data)

        total = 0

        for item_data in items_data:
            amount = item_data.get('amount', 0) or 0
            total += amount

            IncomeItem.objects.create(
                income=income,
                payer_person_ct=income.payer_person_ct,
                payer_person_object_id=income.payer_person_object_id,
                created_by=income.created_by,
                **item_data
            )

        income.amount = total
        income.save()

        return income
    
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

            IncomeItem.objects.create(
                income=instance,
                payer_person_ct=instance.payer_person_ct,
                payer_person_object_id=instance.payer_person_object_id,
                created_by=instance.created_by,
                **item_data
            )

        instance.amount = total
        instance.is_reversed = False
        instance.reversed_at = None
        instance.reversed_by = None
        instance.reverse_income = None
        instance.save()

        return instance

class InstallmentPaymentSerializer(serializers.ModelSerializer):
    receiver_name = serializers.SerializerMethodField()
    receiver_type = serializers.CharField(source="sales_payment.receiver_type", read_only=True)
    receiver_type_label = serializers.SerializerMethodField()
    reference = serializers.CharField(source="sales_payment.reference", read_only=True)
    accounting_document = serializers.IntegerField(source="sales_payment.accounting_document_id", read_only=True)

    class Meta:
        model = InstallmentPayment
        fields = [
            "id", "amount", "payment_date", "receiver_type", "receiver_type_label",
            "receiver_name", "reference", "accounting_document", "is_reversed",
            "reversed_at", "reversed_by", "created_at",
        ]

    def get_receiver_type_label(self, obj):
        labels = {"bank": "بانک", "cashbox": "صندوق", "imprest": "تنخواه‌گردان", "cheque": "چک"}
        return labels.get(obj.sales_payment.receiver_type, obj.sales_payment.receiver_type)

    def get_receiver_name(self, obj):
        payment = obj.sales_payment
        model_map = {"bank": Bank, "cashbox": CashBox, "imprest": Imprest}
        model = model_map.get(payment.receiver_type)
        if not model:
            return None
        target = model.objects.filter(pk=payment.receiver_id, is_deleted=0).first()
        return getattr(target, "name", None) if target else None


class InstallmentScheduleSerializer(serializers.ModelSerializer):
    remaining_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    contract_id = serializers.IntegerField(source="contract.id", read_only=True)
    contract_number = serializers.IntegerField(source="contract.contract_number", read_only=True)
    invoice_code = serializers.IntegerField(source="contract.invoice.code", read_only=True)
    customer_name = serializers.SerializerMethodField()
    display_status = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    days_overdue = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()

    class Meta:
        model = InstallmentSchedule
        fields = [
            "id", "contract_id", "contract_number", "invoice_code", "customer_name", "sequence", "due_date",
            "amount", "paid_amount", "remaining_amount", "status", "status_label",
            "display_status", "days_overdue", "payments",
        ]

    def get_customer_name(self, obj):
        customer = obj.contract.customer
        return customer.company or " ".join(filter(None, [customer.first_name, customer.last_name])) or f"مشتری {customer.code}"

    def get_display_status(self, obj):
        if obj.status == InstallmentSchedule.Status.PAID:
            return "PAID"
        if obj.due_date < timezone.localdate() and obj.remaining_amount > 0:
            return "OVERDUE"
        return obj.status

    def get_status_label(self, obj):
        display = self.get_display_status(obj)
        labels = {
            "PENDING": "در انتظار",
            "PARTIAL": "پرداخت جزئی",
            "PAID": "پرداخت شده",
            "OVERDUE": "سررسید گذشته",
        }
        return labels.get(display, display)

    def get_days_overdue(self, obj):
        if self.get_display_status(obj) != "OVERDUE":
            return 0
        return (timezone.localdate() - obj.due_date).days

    def get_payments(self, obj):
        rows = [row for row in obj.installment_payments.all() if row.is_deleted == 0]
        return InstallmentPaymentSerializer(rows, many=True).data


class InstallmentContractSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_code = serializers.IntegerField(source="customer.code", read_only=True)
    invoice_code = serializers.IntegerField(source="invoice.code", read_only=True)
    invoice_reference = serializers.CharField(source="invoice.reference", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    overdue_count = serializers.SerializerMethodField()
    next_due_date = serializers.SerializerMethodField()
    installments = InstallmentScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = InstallmentContract
        fields = [
            "id", "contract_number", "invoice", "invoice_code", "invoice_reference",
            "customer", "customer_code", "customer_name", "contract_date", "first_due_date",
            "installment_count", "interval_months", "invoice_total_amount", "paid_before_contract",
            "financed_amount", "paid_amount", "remaining_amount", "overdue_count", "next_due_date",
            "status", "status_label", "notes", "cancelled_at", "cancelled_by", "installments",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        customer = obj.customer
        return customer.company or " ".join(filter(None, [customer.first_name, customer.last_name])) or f"مشتری {customer.code}"

    def get_paid_amount(self, obj):
        return sum((item.paid_amount for item in obj.installments.all() if item.is_deleted == 0), Decimal("0.00"))

    def get_remaining_amount(self, obj):
        return max(Decimal("0.00"), obj.financed_amount - self.get_paid_amount(obj))

    def get_overdue_count(self, obj):
        if obj.status != InstallmentContract.Status.ACTIVE:
            return 0
        today = timezone.localdate()
        return sum(1 for item in obj.installments.all() if item.is_deleted == 0 and item.due_date < today and item.remaining_amount > 0)

    def get_next_due_date(self, obj):
        if obj.status != InstallmentContract.Status.ACTIVE:
            return None
        item = min((row for row in obj.installments.all() if row.is_deleted == 0 and row.remaining_amount > 0), key=lambda row: (row.due_date, row.sequence), default=None)
        return item.due_date if item else None


class InstallmentContractListSerializer(InstallmentContractSerializer):
    """Compact listing; schedules and receipt history belong to the detail API."""
    class Meta(InstallmentContractSerializer.Meta):
        fields = [field for field in InstallmentContractSerializer.Meta.fields if field != "installments"]
        read_only_fields = fields

    def get_paid_amount(self, obj):
        return obj.schedule_paid_total

    def get_overdue_count(self, obj):
        return obj.schedule_overdue_count if obj.status == InstallmentContract.Status.ACTIVE else 0

    def get_next_due_date(self, obj):
        return obj.schedule_next_due if obj.status == InstallmentContract.Status.ACTIVE else None


class InstallmentContractCreateSerializer(serializers.Serializer):
    invoice_id = serializers.IntegerField(min_value=1)
    contract_date = serializers.DateField()
    first_due_date = serializers.DateField()
    installment_count = serializers.IntegerField(min_value=1, max_value=120)
    interval_months = serializers.IntegerField(min_value=1, max_value=24, default=1)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        if attrs["first_due_date"] < attrs["contract_date"]:
            raise serializers.ValidationError({"first_due_date": "اولین سررسید نمی‌تواند قبل از تاریخ قرارداد باشد."})
        return attrs


class InstallmentPaySerializer(serializers.Serializer):
    request_key = serializers.UUIDField(required=False)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    receiver_type = serializers.ChoiceField(choices=[("bank", "بانک"), ("cashbox", "صندوق"), ("imprest", "تنخواه")])
    receiver_id = serializers.IntegerField(min_value=1)
    payment_date = serializers.DateField(required=False)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class InstallmentEligibleInvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    remaining_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = salesInvoice
        fields = ["id", "code", "reference", "date", "customer_name", "total_amount", "paid_amount", "remaining_amount", "currency"]

    def get_customer_name(self, obj):
        customer = obj.customer_name
        return customer.company or " ".join(filter(None, [customer.first_name, customer.last_name])) or f"مشتری {customer.code}"

