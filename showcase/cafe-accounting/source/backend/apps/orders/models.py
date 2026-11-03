import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Q

from apps.floor.models import DiningTable
from apps.menu.models import MenuItem
from apps.organizations.models import Branch, Cafe


class Customer(models.Model):
    phone_validator = RegexValidator(r"^09\d{9}$", "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد.")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cafe = models.ForeignKey(Cafe, on_delete=models.CASCADE, related_name="customers")
    first_name = models.CharField(max_length=80, blank=True)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=11, blank=True, validators=[phone_validator])
    notes = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("last_name", "first_name")
        constraints = [
            models.UniqueConstraint(
                fields=("cafe", "phone"),
                condition=Q(is_active=True) & ~Q(phone=""),
                name="unique_active_customer_phone_per_cafe",
            )
        ]
        indexes = [models.Index(fields=("cafe", "last_name"), name="customer_cafe_last_name_idx")]

    def __str__(self):
        return " ".join(part for part in (self.first_name, self.last_name) if part)


class Order(models.Model):
    checkout_request_id = models.UUIDField(null=True, blank=True, unique=True)
    checkout_payload = models.JSONField(default=dict, blank=True)

    class OrderType(models.TextChoices):
        DINE_IN = "dine_in", "داخل سالن"
        TAKEAWAY = "takeaway", "بیرون‌بر"

    class Status(models.TextChoices):
        OPEN = "open", "باز"
        SETTLED = "settled", "تسویه‌شده"
        CANCELLED = "cancelled", "لغوشده"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="orders")
    order_type = models.CharField(
        max_length=20,
        choices=OrderType.choices,
        default=OrderType.DINE_IN,
    )
    table = models.ForeignKey(
        DiningTable,
        on_delete=models.PROTECT,
        related_name="orders",
        null=True,
        blank=True,
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="orders",
        null=True,
        blank=True,
    )
    customer_last_name = models.CharField(max_length=100, blank=True)
    customer_phone = models.CharField(max_length=11, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    notes = models.CharField(max_length=500, blank=True)
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="opened_orders",
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=500, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="cancelled_orders",
        null=True,
        blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-opened_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("table",),
                condition=Q(status="open", table__isnull=False),
                name="unique_open_order_per_table",
            ),
            models.CheckConstraint(
                condition=(
                    Q(order_type="dine_in", table__isnull=False)
                    | Q(order_type="takeaway", table__isnull=True)
                ),
                name="order_type_table_consistency",
            ),
        ]

    def __str__(self):
        location = self.table or f"{self.branch} - بیرون‌بر"
        return f"{location} - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        if self.table_id:
            table_branch_id = self.table.branch_id
            if self.branch_id and self.branch_id != table_branch_id:
                raise ValidationError("شعبه سفارش باید با شعبه میز یکسان باشد.")
            self.branch_id = table_branch_id
        elif not self.branch_id:
            raise ValidationError("ثبت شعبه برای سفارش الزامی است.")
        super().save(*args, **kwargs)

    @property
    def total(self):
        return sum(item.line_total for item in self.items.all())

    @property
    def receipt_number(self):
        return f"CA-{self.id.hex.upper()}"


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT, related_name="order_items")
    item_name = models.CharField(max_length=120)
    unit_price = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    quantity = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
    )
    cost_total = models.DecimalField(max_digits=30, decimal_places=6, null=True, blank=True)
    notes = models.CharField(max_length=250, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("order", "menu_item"),
                name="unique_menu_item_per_order",
            ),
            models.CheckConstraint(
                condition=Q(cost_total__isnull=True) | Q(cost_total__gte=0),
                name="order_item_cost_nonnegative",
            ),
        ]

    def __str__(self):
        return f"{self.item_name} × {self.quantity}"

    @property
    def line_total(self):
        return self.unit_price * self.quantity


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "نقدی"
        CARD = "card", "کارت‌خوان"
        TRANSFER = "card_to_card", "کارت به کارت"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="payments")
    method = models.CharField(max_length=20, choices=Method.choices)
    amount = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    reference = models.CharField(max_length=100, blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="payment_amount_gt_zero")
        ]

    def __str__(self):
        return f"{self.get_method_display()} - {self.amount}"


class OrderAddition(models.Model):
    """Acknowledgement for an atomic, replayable addition to an existing order."""

    request_id = models.UUIDField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="additions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    payload = models.JSONField()

    def __str__(self):
        return str(self.request_id)
