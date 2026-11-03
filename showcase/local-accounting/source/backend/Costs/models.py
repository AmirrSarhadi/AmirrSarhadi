from django.utils import timezone
from django.db import models
from Persons.models import Vendor,Drivers
from Services.models import material
from django.utils.translation import gettext_lazy as _
from decimal import Decimal
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from Accounting.models import Document
from .managers import SoftDeleteManager, AllObjectsManager
from core.models import AuditMixin

class buyInvoice(AuditMixin):
    
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "پیش نویس"
        PENDING = "PENDING", "در انتظار تایید"
        APPROVED = "APPROVED", "تایید شده"
        PAID = "PAID", "پرداخت شده"
        REVERSED = "REVERSED", "مرجوع شده"


    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    
    code = models.IntegerField(unique=True)
    reference = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=100)
    date = models.DateField(default=timezone.localdate)
    expiry_date = models.DateField(blank=True, null=True)
    invoice_type = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT,
        related_name="buy_invoices",
        null=True,
        blank=True,
    )
    warehouse = models.ForeignKey(
    "Warehousing.warehouse",
    on_delete=models.PROTECT,
    null=True,
    blank=True,
    related_name="buy_invoices",
    verbose_name=_("انبار مقصد"),
    )
    currency = models.CharField("واحد پول" , max_length=25)
    discount_percent = models.FloatField(default=0)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.FloatField(default=10)
    tax_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method= models.CharField(max_length=20)

    # accounting fields
    accounting_document = models.ForeignKey(
    Document,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="buy_invoices",
    )

    is_locked = models.BooleanField(default=False)

    is_reversed = models.BooleanField(default=False)

    reversed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reversed_by = models.CharField(
        max_length=50,
        null=True,
        blank=True,
    )

    warehouse_receipt = models.ForeignKey(
    "Warehousing.WarehouseReceipt",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="buy_invoice_receipts",
    verbose_name=_("رسید انبار"),
    )

    payment_date = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)
    shipping_cost = models.PositiveIntegerField()
    shipping_person = models.ForeignKey(Drivers, on_delete=models.SET_NULL, null=True, blank=True, related_name="buy_invoice_shipping_person")
    additional_amount = models.IntegerField()
    sign = models.ImageField(
    upload_to='Costs/static/images/sign/',
    null=True,
    blank=True,
    )
    get_returned = models.BooleanField(default=False, verbose_name=_("برگشت از خرید"))
    city = models.TextField(blank=True, default="")
    is_deleted = models.BooleanField(default=False)
    
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()
    @property
    def remaining_amount(self):
        return (self.total_amount or Decimal("0")) - (self.paid_amount or Decimal("0"))
    
    def __str__(self):
        return f"Invoice {self.code} - {self.description}"
    
    class Meta:
        verbose_name = _("فاکنور خرید")
        verbose_name_plural = _("فاکتور های خرید")


class buyInvoice_Item(AuditMixin):
    invoice = models.ForeignKey(
        buyInvoice,
        on_delete=models.PROTECT,
        related_name="items"
    )

    material = models.ForeignKey(material, on_delete=models.CASCADE, null=True)  # رابطه با کالا
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField("قیمت واحد", max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    is_deleted = models.BooleanField(
        default=False
    )
    def __str__(self):
        return f"{self.material.persian_name} x {self.quantity}"
    
    class Meta:
        verbose_name = _("فاکنور خرید")
        verbose_name_plural = _("فاکتور های خرید")

class BuyInvoicePayment(AuditMixin):
    PAYER_TYPES = [
        ("bank", "بانک"),
        ("cashbox", "صندوق"),
        ("imprest", "تنخواه‌گردان"),
        ("cheque", "چک"),
    ]

    invoice = models.ForeignKey(
        buyInvoice,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    accounting_document = models.ForeignKey(
        "Accounting.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="buy_invoice_payment_records",
        verbose_name=_("سند حسابداری"),
    )

    date = models.DateField(default=timezone.now, verbose_name=_("تاریخ پرداخت"))
    amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("مبلغ پرداخت"))
    payer_type = models.CharField(max_length=20, choices=PAYER_TYPES)
    payer_id = models.PositiveIntegerField()

    reference = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.CharField(max_length=50, null=True, blank=True)

    is_deleted = models.BooleanField(
        default=False
    )
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()
    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("پرداخت فاکتور خرید")
        verbose_name_plural = _("پرداخت‌های فاکتور خرید")

class Expense(AuditMixin):
    class Currency(models.TextChoices):
        IRR = 'ریال ایران'
        CAD = 'دلار کانادا'
        EUR = 'یورو'
        USD = 'دلار آمریکا'
        AED = 'درهم امارات عربی'
        OMR = 'ریال عمان'

    expense_number = models.BigIntegerField(verbose_name=_('شماره هزینه'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ هزینه'))
    description = models.TextField(null=True, blank=True, verbose_name=_('شرح هزینه'))
    currency = models.CharField(
        max_length=255,
        choices=Currency.choices,
        default=Currency.IRR,
        null=True,
        blank=True,
        verbose_name=_('واحد پول')
    )

    payer_person_ct = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='expense_payers'
    )
    payer_person_object_id = models.PositiveIntegerField(null=True, blank=True)
    payer = GenericForeignKey('payer_person_ct', 'payer_person_object_id')

    amount = models.BigIntegerField(null=True, blank=True, verbose_name=_('مبلغ'))

    accounting_document = models.ForeignKey(
    Document,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="expenses",
    verbose_name=_("سند حسابداری"),
    )

    is_locked = models.BooleanField(default=False)
    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.CharField(max_length=50, null=True, blank=True)

    reverse_expense = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reverse_entries",
    )

    is_deleted = models.BooleanField(
        default=False
    )
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()
    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"هزینه {self.amount} برای {self.payer}"

    class Meta:
        verbose_name = _('هزینه')
        verbose_name_plural = _('هزینه‌ها')


class ExpenseItem(AuditMixin):
    EXPENSE_DEST_TYPES = [
        ('bank', 'بانک'),
        ('cashbox', 'صندوق'),
        ('imprest', 'تنخواه‌گردان'),
        ('cheque', 'چک'),
    ]

    expense = models.ForeignKey(
        Expense,
        on_delete=models.PROTECT,
        related_name='items'
    )

    payer_person_ct = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='expense_items_as_payer'
    )
    payer_person_object_id = models.PositiveIntegerField(null=True, blank=True)
    payer = GenericForeignKey('payer_person_ct', 'payer_person_object_id')

    receiver_type = models.CharField(max_length=20, choices=EXPENSE_DEST_TYPES)
    receiver_id = models.PositiveIntegerField()

    amount = models.BigIntegerField(verbose_name='مبلغ')
    bank_fees = models.BigIntegerField(default=0, verbose_name='کارمزد بانکی')
    reference = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    is_deleted = models.BooleanField(
        default=False
    )
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()
    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _('آیتم هزینه')
        verbose_name_plural = _('آیتم‌های هزینه')



class WasteInvoice(AuditMixin):
    code = models.BigIntegerField(unique=True, verbose_name=_("شماره ضایعات"))
    reference = models.CharField(max_length=50, unique=True, verbose_name=_("ارجاع"))
    date = models.DateField(default=timezone.now, verbose_name=_("تاریخ"))
    description = models.TextField(blank=True, null=True, verbose_name=_("توضیحات"))

    total_quantity = models.BigIntegerField(default=0, verbose_name=_("تعداد کل"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name=_("مبلغ کل"))

    warehouse = models.ForeignKey(
    "Warehousing.warehouse",
    on_delete=models.PROTECT,
    null=True,
    blank=True,
    related_name="waste_invoices",
    verbose_name=_("انبار خروج"),
    )

    warehouse_receipt = models.ForeignKey(
        "Warehousing.WarehouseReceipt",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="waste_invoice_receipts",
        verbose_name=_("حواله انبار"),
    )

    accounting_document = models.ForeignKey(
        "Accounting.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="waste_invoices",
        verbose_name=_("سند حسابداری"),
    )

    is_locked = models.BooleanField(default=False)
    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.CharField(max_length=50, null=True, blank=True)

    is_deleted = models.BooleanField(default=False)
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()
    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Waste Invoice {self.code}"

    class Meta:
        verbose_name = _("فاکتور ضایعات")
        verbose_name_plural = _("فاکتورهای ضایعات")


class WasteInvoiceItem(AuditMixin):
    invoice = models.ForeignKey(
        WasteInvoice,
        on_delete=models.PROTECT,
        related_name="items"
    )
    material = models.ForeignKey(material, on_delete=models.CASCADE)
    description = models.TextField(blank=True, null=True)

    quantity = models.BigIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    is_deleted = models.BooleanField(default=False)
    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()
    def save(self, *args, **kwargs):
        self.total_price = Decimal(str(self.quantity or 0)) * Decimal(str(self.unit_price or 0))
        if self.pk is not None:
            self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("آیتم ضایعات")
        verbose_name_plural = _("آیتم‌های ضایعات")