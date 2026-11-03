from django.db import models, transaction
from django.core.exceptions import ValidationError
from Services.models import material
from Costs.models import buyInvoice
from Incomes.models import salesInvoice
from django.utils.translation import gettext_lazy as _
from .utils import now_tehran
from core.models import AuditMixin
from .date_utils import (
    parse_warehouse_receipt_date,
)


class warehouse(AuditMixin):
    
    code = models.BigIntegerField(unique=True)
    name = models.CharField(max_length=50, unique=True)
    address = models.CharField(max_length=50)
    manager = models.CharField(max_length=50)
    manager_mobile = models.CharField(max_length=15) 
    phone = models.BigIntegerField()
    is_deleted = models.PositiveIntegerField(verbose_name=_('پاک شده'), default=0)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)
    
    class Meta:
        verbose_name = _("انبار")
        verbose_name_plural = _("انبار ها")
        
    
class inventory(AuditMixin):
    code = models.BigIntegerField(
        unique=True,
        verbose_name=_("کد موجودی"),
    )

    warehouse = models.ForeignKey(
        warehouse,
        on_delete=models.PROTECT,
        related_name="inventories",
    )

    material = models.ForeignKey(
        material,
        on_delete=models.PROTECT,
        related_name="inventories",
    )

    material_initial_inventory = models.DecimalField(
        "چه مقدار از موجودی اولیه است",
        max_digits=20,
        decimal_places=3,
        default=0,
    )

    total = models.DecimalField(
        max_digits=20,
        decimal_places=3,
        default=0,
    )

    is_deleted = models.PositiveIntegerField(
        verbose_name=_("پاک شده"),
        default=0,
    )

    def __str__(self):
        return (
            f"{self.warehouse} - "
            f"{self.material} - "
            f"{self.total}"
        )


    class Meta:
        verbose_name = _("موجودی انبار")
        verbose_name_plural = _("موجودی‌های انبارها")

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "warehouse",
                    "material",
                ],
                condition=models.Q(
                    is_deleted=0,
                ),
                name=(
                    "unique_active_inventory_"
                    "warehouse_material"
                ),
            ),
            models.CheckConstraint(
                condition=models.Q(
                    material_initial_inventory__gte=0,
                ),
                name=(
                    "inventory_initial_qty_"
                    "non_negative"
                ),
            ),

            models.CheckConstraint(
                condition=models.Q(total__gte=0),
                name="inventory_total_non_negative",
            ),
            
        ]

    def save(self, *args, **kwargs):

        skip_inventory_validation = kwargs.pop(
            "skip_inventory_validation",
            False
        )

        if self.pk and not skip_inventory_validation:

            old = inventory.objects.get(pk=self.pk)

            if old.total != self.total:
                raise ValidationError(
                    "تغییر مستقیم موجودی مجاز نیست. از رسید/انتقال/اصلاح موجودی استفاده کنید."
                )

        super().save(*args, **kwargs)

class StockMovement(AuditMixin):

    class MovementType(models.TextChoices):
        RECEIPT = "RECEIPT", "رسید"
        ISSUE = "ISSUE", "خروج"
        TRANSFER = "TRANSFER", "انتقال"
        ADJUSTMENT = "ADJUSTMENT", "اصلاح موجودی"
        WASTE = "WASTE", "ضایعات"

    warehouse = models.ForeignKey(
        warehouse,
        on_delete=models.PROTECT,
        related_name="stock_movements"
    )

    material = models.ForeignKey(
        material,
        on_delete=models.PROTECT,
        related_name="stock_movements"
    )

    quantity = models.DecimalField(
        max_digits=20,
        decimal_places=3
    )

    movement_type = models.CharField(
        max_length=30,
        choices=MovementType.choices
    )

    reference_type = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    reference_id = models.PositiveIntegerField(
        blank=True,
        null=True
    )

    date = models.DateTimeField(
        default=now_tehran
    )

    description = models.TextField(
        blank=True,
        null=True
    )

class WarehouseReceipt(AuditMixin):
    class Direction(models.TextChoices):
        IN = 'ورودی'
        OUT = 'خروجی'

    class ReceiptType(models.TextChoices):
        SALES_INVOICE = 'فاکتور فروش'
        PURCHASE_INVOICE = 'فاکتور خرید'
        SALES_RETURN = 'فاکتور برگشت از فروش'
        PURCHASE_RETURN = 'فاکتور برگشت از خرید'
        WASTE = 'فاکتور ضایعات'
        TRANSFER = 'انتقال'

    class Status(models.TextChoices):
        COMPLETE = 'کامل'
        DRAFT = 'پیش‌نویس'
        CANCELLED = 'لغو شده'
        INCOMPLETE = 'ناقص'

    number = models.PositiveIntegerField(verbose_name=_('شماره حواله'))
    date = models.CharField(max_length=100, verbose_name=_('تاریخ')) 
    effective_date = models.DateField(
        null=True,
        blank=True, 
        db_index=True,
        verbose_name=_("تاریخ استاندارد"),
    )
    direction = models.CharField(max_length=10, choices=Direction.choices, verbose_name=_('نوع ورود/خروج'))
    from_warehouse = models.ForeignKey(warehouse, on_delete=models.CASCADE, related_name='receipts_from', verbose_name=_('از انبار'))

    # If transfer type → destination warehouse
    destination_warehouse = models.ForeignKey(
        warehouse, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='receipts_to', verbose_name=_('انبار مقصد')
    )

    type = models.CharField(max_length=50, choices=ReceiptType.choices, verbose_name=_('نوع حواله'))

    # Conditional foreign keys
    sales_invoice = models.ForeignKey(salesInvoice, on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_('فاکتور فروش'))
    buy_invoice = models.ForeignKey(buyInvoice, on_delete=models.SET_NULL, null=True, blank=True, verbose_name=_('فاکتور خرید'))
    
    description = models.TextField(blank=True, null=True, verbose_name=_('توضیحات'))
    transport = models.CharField(max_length=255, blank=True, null=True, verbose_name=_('حمل و نقل'))
    handover = models.CharField(max_length=255, blank=True, null=True, verbose_name=_('تحویل‌دهنده / تحویل‌گیرنده'))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name=_('وضعیت'))

    is_reversed = models.BooleanField(default=False, verbose_name="ابطال شده")
    reversed_at = models.DateTimeField(
    null=True,
    blank=True,
    verbose_name=_("تاریخ ابطال"),
    )

    reversed_by = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name=_("ابطال‌کننده"),
    )

    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))

    def __str__(self):
        return f'{self.number} - {self.direction} - {self.type}'
    
    @transaction.atomic
    def save(self, *args, **kwargs):
        if self._state.adding:
            from .services.numbering import reserve_receipt_number
            self.number = reserve_receipt_number(self.number)
        self.effective_date = (
            parse_warehouse_receipt_date(
                self.date
            )
        )

        if self.pk is not None:
            self.updated_at = now_tehran()

        update_fields = kwargs.get("update_fields")

        if update_fields is not None:
            update_fields = set(update_fields)

            if "date" in update_fields:
                update_fields.add("effective_date")

            kwargs["update_fields"] = list(
                update_fields
            )

        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("رسید/حواله انبار")
        verbose_name_plural = _("رسیدها و حواله‌های انبار")
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["number"],
                condition=models.Q(
                    is_deleted=0,
                ),
                name=(
                    "unique_active_warehouse_"
                    "receipt_number"
                ),
            ),
        ]


class WarehouseReceiptItem(models.Model):
    receipt = models.ForeignKey(WarehouseReceipt, on_delete=models.CASCADE, related_name='items')
    material = models.ForeignKey(material, on_delete=models.CASCADE, verbose_name=_('کالا'))
    material_code = models.CharField(max_length=100, verbose_name=_('کد کالا'))
    unit = models.CharField(max_length=50, verbose_name=_('واحد'))
    quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_('تعداد'))
    reference = models.CharField(max_length=255, blank=True, null=True, verbose_name=_('ارجاع'))
    # available_quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_('موجود'))
    description = models.TextField(blank=True, null=True, verbose_name=_('توضیحات'))

    def __str__(self):
        return f'{self.material} - {self.quantity} {self.unit}'

    class Meta:
        verbose_name = _("آیتم رسید/حواله انبار")
        verbose_name_plural = _(
            "آیتم‌های رسید/حواله انبار"
        )

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "receipt",
                    "material",
                ],
                name=(
                    "unique_material_per_"
                    "warehouse_receipt"
                ),
            ),
            models.CheckConstraint(
                condition=models.Q(
                    quantity__gt=0,
                ),
                name=(
                    "warehouse_receipt_item_"
                    "quantity_positive"
                ),
            ),
        ]



class StockTaking(AuditMixin):
    class Status(models.TextChoices):
        IN_PROGRESS = "در جریان دارد"
        FINISHED = "پایان یافته"

    accounting_document = models.CharField(max_length=100, blank=True, null=True, verbose_name=_("سند حسابداری"))
    number = models.PositiveIntegerField(verbose_name=_("شماره انبارگردانی"))
    date = models.CharField(max_length=20, verbose_name=_("تاریخ"))
    warehouse = models.ForeignKey(warehouse, on_delete=models.CASCADE, related_name="stocktakings", verbose_name=_("انبار"))
    description = models.TextField(blank=True, null=True, verbose_name=_("توضیحات"))
    operator = models.CharField(max_length=100, verbose_name=_("متصدی"))
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.IN_PROGRESS, verbose_name=_("وضعیت"))

    is_deleted = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.number} - {self.warehouse.name}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("انبارگردانی")
        verbose_name_plural = _("انبارگردانی‌ها")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["warehouse"],
                condition=models.Q(status="در جریان دارد", is_deleted=0),
                name="unique_active_stocktaking_per_warehouse",
            )
        ]


class StockTakingItem(models.Model):
    stocktaking = models.ForeignKey(StockTaking, on_delete=models.CASCADE, related_name="items")
    material = models.ForeignKey(material, on_delete=models.CASCADE, verbose_name=_("کالا"))

    material_name = models.CharField(max_length=100)
    category_name = models.CharField(max_length=100, blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    material_code = models.CharField(max_length=100, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)

    initial_qty = models.DecimalField(max_digits=20, decimal_places=3, default=0)
    unit_price = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    count_1 = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True)
    count_2 = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True)
    count_3 = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True)
    final_qty = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True)
    difference = models.DecimalField(max_digits=20, decimal_places=3, null=True, blank=True)

    created_at = models.DateTimeField(default=now_tehran, editable=False)

    def save(self, *args, **kwargs):
        if self.final_qty is not None:
            self.difference = self.final_qty - self.initial_qty
        super().save(*args, **kwargs)

    def __str__(self):
        return self.material_name

    class Meta:
        verbose_name = _("آیتم انبارگردانی")
        verbose_name_plural = _("آیتم‌های انبارگردانی")


class WarehouseReceiptSequence(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(id=1), name="single_warehouse_receipt_sequence")]
