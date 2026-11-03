import re

from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.floor.models import DiningTable
from apps.menu.models import MenuItem

from .customer_details import clean_customer_details
from .models import Customer, Order, OrderItem, Payment


class CustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="__str__", read_only=True)
    phone = serializers.CharField(max_length=20, allow_blank=True, required=False)

    class Meta:
        model = Customer
        fields = ("id", "first_name", "last_name", "full_name", "phone", "notes")
        read_only_fields = ("id", "full_name")

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("نام خانوادگی نمی‌تواند خالی باشد.")
        return value

    def validate_phone(self, value):
        normalized = value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
        normalized = re.sub(r"[\s-]", "", normalized)
        if normalized and not re.fullmatch(r"09\d{9}", normalized):
            raise serializers.ValidationError("شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد.")
        return normalized

    def create(self, validated_data):
        validated_data["cafe_id"] = self.context["cafe_id"]
        return self._save_with_unique_error(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._save_with_unique_error(super().update, instance, validated_data)

    def _save_with_unique_error(self, save, *args):
        try:
            with transaction.atomic():
                return save(*args)
        except IntegrityError as error:
            raise serializers.ValidationError(
                {"phone": "مشتری فعالی با این شماره موبایل وجود دارد."}
            ) from error


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item_id = serializers.UUIDField(read_only=True)
    menu_item = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.none(), write_only=True
    )
    line_total = serializers.IntegerField(read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "menu_item",
            "menu_item_id",
            "item_name",
            "unit_price",
            "quantity",
            "notes",
            "line_total",
        )
        read_only_fields = ("id", "item_name", "unit_price", "line_total")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        cafe_id = self.context.get("cafe_id")
        if cafe_id:
            self.fields["menu_item"].queryset = MenuItem.objects.filter(
                category__cafe_id=cafe_id,
                category__is_active=True,
                is_active=True,
                is_available=True,
            )

    def create(self, validated_data):
        menu_item = validated_data["menu_item"]
        validated_data.update(
            order=self.context["order"],
            item_name=menu_item.name,
            unit_price=menu_item.price,
        )
        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(id=self.context["order"].id)
                if order.status != Order.Status.OPEN:
                    raise serializers.ValidationError({"order": "فقط سفارش باز قابل تغییر است."})
                return super().create(validated_data)
        except IntegrityError as error:
            raise serializers.ValidationError(
                {"menu_item": "این آیتم قبلاً به سفارش افزوده شده است؛ تعداد را ویرایش کنید."}
            ) from error


class OrderItemAdjustmentSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=100)


class OrderTableTransferSerializer(serializers.Serializer):
    table = serializers.PrimaryKeyRelatedField(queryset=DiningTable.objects.none())

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        branch = self.context.get("branch")
        if branch:
            self.fields["table"].queryset = DiningTable.objects.filter(
                branch=branch,
                is_active=True,
            )


class PaymentSerializer(serializers.ModelSerializer):
    method_label = serializers.CharField(source="get_method_display", read_only=True)

    class Meta:
        model = Payment
        fields = ("id", "method", "method_label", "amount", "reference", "created_at")
        read_only_fields = fields


class PaymentInputSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    amount = serializers.IntegerField(min_value=1)
    reference = serializers.CharField(max_length=100, allow_blank=True, required=False)


class OrderingCustomerSerializer(serializers.Serializer):
    last_name = serializers.CharField(max_length=100, allow_blank=True, required=False, default="")
    phone = serializers.CharField(max_length=30, allow_blank=True, required=False, default="")

    def validate(self, attrs):
        return clean_customer_details(attrs)


class CustomerPhoneLookupSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=30)

    def validate_phone(self, value):
        phone = clean_customer_details({"phone": value})["phone"]
        if not phone:
            raise serializers.ValidationError("شماره تماس الزامی است.")
        return phone


class SettlementSerializer(serializers.Serializer):
    payments = PaymentInputSerializer(many=True, allow_empty=False, max_length=5)
    customer_details = OrderingCustomerSerializer(required=False)


class CancellationSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3, max_length=500, trim_whitespace=True)


class DailyReportQuerySerializer(serializers.Serializer):
    date = serializers.DateField(required=False)


class ReceiptArchiveQuerySerializer(serializers.Serializer):
    search = serializers.CharField(max_length=120, allow_blank=True, required=False, default="")
    date = serializers.DateField(required=False)


class SalesRangeQuerySerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    output = serializers.ChoiceField(choices=("json", "csv"), default="json")

    def validate(self, attrs):
        if attrs["start_date"] > attrs["end_date"]:
            raise serializers.ValidationError("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.")
        if (attrs["end_date"] - attrs["start_date"]).days >= 366:
            raise serializers.ValidationError("بازه گزارش نمی‌تواند بیشتر از ۳۶۶ روز باشد.")
        return attrs


class OrderSerializer(serializers.ModelSerializer):
    table = serializers.PrimaryKeyRelatedField(
        queryset=DiningTable.objects.none(),
        allow_null=True,
        required=False,
    )
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.none(),
        allow_null=True,
        required=False,
    )
    table_label = serializers.SerializerMethodField()
    order_type_label = serializers.CharField(source="get_order_type_display", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_last_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    total = serializers.IntegerField(read_only=True)
    receipt_number = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_type",
            "order_type_label",
            "table",
            "table_label",
            "customer",
            "customer_name",
            "customer_last_name",
            "customer_phone",
            "status",
            "notes",
            "opened_at",
            "closed_at",
            "cancellation_reason",
            "items",
            "payments",
            "total",
            "receipt_number",
        )
        read_only_fields = (
            "id",
            "order_type_label",
            "status",
            "opened_at",
            "closed_at",
            "cancellation_reason",
            "items",
            "payments",
            "total",
            "receipt_number",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        branch = self.context.get("branch")
        if branch:
            self.fields["table"].queryset = DiningTable.objects.filter(
                branch=branch, is_active=True
            )
            self.fields["customer"].queryset = Customer.objects.filter(
                cafe=branch.cafe,
                is_active=True,
            )

    def create(self, validated_data):
        validated_data["branch"] = self.context["branch"]
        validated_data["opened_by"] = self.context["request"].user
        try:
            with transaction.atomic():
                return super().create(validated_data)
        except IntegrityError as error:
            raise serializers.ValidationError(
                {"table": "این میز در حال حاضر سفارش باز دارد."}
            ) from error

    def validate(self, attrs):
        order_type = attrs.get("order_type", Order.OrderType.DINE_IN)
        table = attrs.get("table")
        if order_type == Order.OrderType.DINE_IN and table is None:
            raise serializers.ValidationError(
                {"table": "برای سفارش داخل سالن، انتخاب میز الزامی است."}
            )
        if order_type == Order.OrderType.TAKEAWAY and table is not None:
            raise serializers.ValidationError({"table": "سفارش بیرون‌بر نباید به میز متصل باشد."})
        return attrs

    def get_table_label(self, instance):
        return instance.table.label if instance.table_id else "بیرون‌بر"

    def get_customer_name(self, instance):
        return instance.customer_last_name or (
            str(instance.customer) if instance.customer_id else None
        )

    def get_customer_last_name(self, instance):
        return instance.customer_last_name or (
            instance.customer.last_name if instance.customer_id else ""
        )

    def get_customer_phone(self, instance):
        return instance.customer_phone or (instance.customer.phone if instance.customer_id else "")


class CheckoutLineSerializer(serializers.Serializer):
    menu_item = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    unit_price = serializers.IntegerField(min_value=1)


class OrderAdditionSerializer(serializers.Serializer):
    request_id = serializers.UUIDField()
    items = CheckoutLineSerializer(many=True, allow_empty=False, max_length=100)

    def validate_items(self, value):
        ids = [row["menu_item"] for row in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("هر آیتم را یک بار با تعداد موردنظر ارسال کنید.")
        return value


class CheckoutSerializer(OrderAdditionSerializer):
    table = serializers.UUIDField(required=False, allow_null=True, default=None)
    customer_details = OrderingCustomerSerializer(required=False)
