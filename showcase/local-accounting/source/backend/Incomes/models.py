from django.utils import timezone
from django.db import models
from django.core.exceptions import ValidationError
from django_jalali.db import models as jmodels
from Persons.models import Seller,Customer,Drivers,Vendor
from Services.models import material 
from decimal import Decimal
from .utils import now_tehran
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from Accounting.models import Document
from core.models import AuditMixin
class salesInvoice(AuditMixin):
    
    TYPE_CHOICES = [
        ('پیش نویس', 'پیش نویس'),
        ('تایید شده', 'تایید شده'),
        ('دریافت شده', 'دریافت شده'),
        ('مرجوع شده', 'مرجوع شده'),
    ]
    
    code = models.BigIntegerField(unique=True)
    reference = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=100)
    date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(blank=True, null=True)
    invoice_type = models.CharField(max_length=50,choices=TYPE_CHOICES, default='پیش نویس')
    # customer_code = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="customer_code")
    customer_name = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="customer_name")
    warehouse = models.ForeignKey(
    "Warehousing.warehouse",
    on_delete=models.PROTECT,
    null=True,
    blank=True,
    related_name="sales_invoices",
    verbose_name=_("انبار خروج"),
    )
    currency = models.CharField("واحد پول", max_length=25)
    seller = models.ForeignKey(Seller, on_delete=models.CASCADE, related_name="seller_name")
    # seller_percentage = models.ForeignKey(Seller, on_delete=models.CASCADE, related_name="seller_percentage")
    discount_percent = models.FloatField(default=0)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.FloatField(default=10)
    tax_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2)
    accounting_document = models.ForeignKey(
        "Accounting.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_invoices",
        verbose_name=_("سند حسابداری"),
    )
    payment_document = models.ForeignKey(
        "Accounting.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_invoice_payments",
        verbose_name=_("سند دریافت وجه"),
    )
    warehouse_receipt = models.ForeignKey(
    "Warehousing.WarehouseReceipt",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="sales_invoice_receipts",
    verbose_name=_("حواله انبار"),
    )
    is_locked = models.BooleanField(default=False)
    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.CharField(max_length=50, null=True, blank=True)
    payment_method= models.CharField(max_length=20)
    payment_date = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)
    shipping_cost = models.PositiveIntegerField()
    shipping_person = models.ForeignKey(Drivers, on_delete=models.SET_NULL, null=True, blank=True, related_name="sales_invoice_shipping_person")
    additional_amount = models.BigIntegerField()
    sign = models.ImageField(upload_to='Incomes/static/images/sign/',null=True,blank=True)
    city = models.TextField(blank=True, default="")
    get_returned = models.BooleanField(default=False)
    is_deleted = models.PositiveIntegerField(verbose_name=_('پاک شده'), default=0)

    @property
    def remaining_amount(self):
        return (self.total_amount or Decimal("0")) - (self.paid_amount or Decimal("0"))


    def __str__(self):
        return f"Invoice {self.code} - {self.description}"
    
    class Meta:
        verbose_name = _("فاکنور فروش")
        verbose_name_plural = _("فاکتور های فروش")


class salesInvoice_Item(AuditMixin):
    unit_cost_snapshot = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    invoice = models.ForeignKey(salesInvoice, on_delete=models.CASCADE, related_name="items")
    material = models.ForeignKey(material, on_delete=models.CASCADE,null=True)  # رابطه با material
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField("قیمت واحد", max_digits=10, decimal_places=2)
    
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    is_deleted = models.PositiveIntegerField(verbose_name=_('پاک شده'), default=0)

    def __str__(self):
        return f"{self.material.persian_name} x {self.quantity}"
    
    class Meta:
        verbose_name = _("آیتم فاکنور فروش")
        verbose_name_plural = _("آیتم های فاکتور فروش")

class SalesInvoicePayment(AuditMixin):
    request_key = models.CharField(max_length=100, null=True, blank=True)
    request_hash = models.CharField(max_length=64, blank=True, default="")
    RECEIVER_TYPES = [
        ("bank", "بانک"),
        ("cashbox", "صندوق"),
        ("imprest", "تنخواه‌گردان"),
        ("cheque", "چک"),
    ]

    invoice = models.ForeignKey(
        salesInvoice,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name=_("فاکتور فروش"),
    )

    accounting_document = models.ForeignKey(
        "Accounting.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_invoice_payment_records",
        verbose_name=_("سند حسابداری"),
    )

    date = models.DateField(default=timezone.now, verbose_name=_("تاریخ پرداخت"))
    amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=_("مبلغ پرداخت"))
    receiver_type = models.CharField(max_length=20, choices=RECEIVER_TYPES)
    receiver_id = models.PositiveIntegerField()

    reference = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.CharField(max_length=50, null=True, blank=True)

    is_deleted = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["invoice", "request_key"], name="unique_invoice_payment_request")]
        verbose_name = _("پرداخت فاکتور فروش")
        verbose_name_plural = _("پرداخت‌های فاکتور فروش")
        

class IncomeDiscount(AuditMixin):
    DISCOUNT_TYPE_CHOICES = [
        ('all_materials', 'همه کالاها'),
        ('all_persons', 'همه اشخاص'),
        ('material', 'کالا'),
        ('person', 'شخص'),
        ('material_category', 'دسته بندی کالا'),
        ('person_category', 'دسته بندی شخص'),
    ]

    title = models.CharField(max_length=100, verbose_name="عنوان")
    discount_type = models.CharField(max_length=30, choices=DISCOUNT_TYPE_CHOICES)
    description = models.CharField(max_length=200, blank=True, null=True)

    percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    valid_from = models.CharField(verbose_name="از تاریخ",max_length=100, null=True, blank=True)
    valid_to = models.CharField(verbose_name="تا تاریخ",max_length=100, null=True, blank=True)
    last_used = models.CharField(verbose_name="تاریخ استفاده",max_length=100, null=True, blank=True)

    single_use = models.BooleanField(default=False, verbose_name="یکبار مصرف")
    usage_count = models.PositiveIntegerField(default=0, verbose_name="تعداد استفاده")
    notes = models.TextField(verbose_name="توضیحات", blank=True, null=True)

    # Generic relation field (optional, points to target)
    target_material = models.ForeignKey(material, on_delete=models.SET_NULL, null=True, blank=True)
    target_customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    target_seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, null=True, blank=True)
    target_vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True)

    is_deleted = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.discount_type}"

    class Meta:
        verbose_name = "تخفیف"
        verbose_name_plural = "اقلام تخفیف دار"
    

class Income(AuditMixin):
    class Currency(models.TextChoices):
        IRR = 'ریال ایران'
        CAD = 'دلار کانادا'
        EUR = 'یورو'
        USD = 'دلار آمریکا'
        AED = 'درهم امارات عربی'
        OMR = 'ریال عمان'

    income_number = models.BigIntegerField(verbose_name=_('شماره درآمد'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ درآمد'))
    description = models.TextField(null=True, blank=True, verbose_name=_('شرح درآمد'))
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
        related_name='income_payers'
    )
    payer_person_object_id = models.PositiveIntegerField(null=True, blank=True)
    payer = GenericForeignKey('payer_person_ct', 'payer_person_object_id')

    amount = models.BigIntegerField(null=True, blank=True, verbose_name=_('مبلغ'))

    accounting_document = models.ForeignKey(
    Document,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="incomes",
    verbose_name=_("سند حسابداری"),
    )

    is_locked = models.BooleanField(default=False)
    is_reversed = models.BooleanField(default=False)

    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.CharField(max_length=50, null=True, blank=True)

    reverse_income = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reverse_entries",
    )

    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))

    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"درآمد {self.amount} از {self.payer}"

    class Meta:
        verbose_name = _('درآمد')
        verbose_name_plural = _('درآمدها')


class IncomeItem(AuditMixin):
    INCOME_DEST_TYPES = [
        ('bank', 'بانک'),
        ('cashbox', 'صندوق'),
        ('imprest', 'تنخواه‌گردان'),
        ('cheque', 'چک'),
    ]

    income = models.ForeignKey(
        Income,
        on_delete=models.CASCADE,
        related_name='items'
    )

    payer_person_ct = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='income_items_as_payer'
    )
    payer_person_object_id = models.PositiveIntegerField(null=True, blank=True)
    payer = GenericForeignKey('payer_person_ct', 'payer_person_object_id')

    receiver_type = models.CharField(max_length=20, choices=INCOME_DEST_TYPES)
    receiver_id = models.PositiveIntegerField()

    amount = models.BigIntegerField(verbose_name='مبلغ')
    bank_fees = models.BigIntegerField(default=0, verbose_name='کارمزد بانکی')
    reference = models.CharField(max_length=100, blank=True, null=True, verbose_name='ارجاع')
    description = models.TextField(blank=True, null=True, verbose_name='شرح')

    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))

    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.amount} -> {self.receiver_type} #{self.receiver_id}"

    class Meta:
        verbose_name = _('آیتم درآمد')
        verbose_name_plural = _('آیتم‌های درآمد')

class InstallmentContractSequence(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    next_value = models.PositiveBigIntegerField(default=1)


class InstallmentContract(AuditMixin):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", _("فعال")
        COMPLETED = "COMPLETED", _("تسویه شده")
        CANCELLED = "CANCELLED", _("لغو شده")

    contract_number = models.BigIntegerField(unique=True, db_index=True)
    invoice = models.OneToOneField(
        salesInvoice,
        on_delete=models.PROTECT,
        related_name="installment_contract",
        verbose_name=_("فاکتور فروش"),
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="installment_contracts",
        verbose_name=_("مشتری"),
    )
    contract_date = models.DateField(default=timezone.now)
    first_due_date = models.DateField()
    installment_count = models.PositiveIntegerField()
    interval_months = models.PositiveSmallIntegerField(default=1)
    invoice_total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_before_contract = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    financed_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    notes = models.TextField(blank=True, null=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(max_length=150, null=True, blank=True)
    is_deleted = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Installment #{self.contract_number} - Invoice {self.invoice.code}"

    class Meta:
        verbose_name = _("قرارداد فروش اقساطی")
        verbose_name_plural = _("قراردادهای فروش اقساطی")
        ordering = ["-created_at"]


class InstallmentSchedule(AuditMixin):
    class Status(models.TextChoices):
        PENDING = "PENDING", _("در انتظار")
        PARTIAL = "PARTIAL", _("پرداخت جزئی")
        PAID = "PAID", _("پرداخت شده")

    contract = models.ForeignKey(
        InstallmentContract,
        on_delete=models.CASCADE,
        related_name="installments",
    )
    sequence = models.PositiveIntegerField()
    due_date = models.DateField(db_index=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    is_deleted = models.PositiveIntegerField(default=0)

    @property
    def remaining_amount(self):
        return max(Decimal("0.00"), (self.amount or Decimal("0")) - (self.paid_amount or Decimal("0")))

    def __str__(self):
        return f"{self.contract.contract_number}/{self.sequence}"

    class Meta:
        verbose_name = _("قسط")
        verbose_name_plural = _("اقساط")
        ordering = ["due_date", "sequence"]
        constraints = [
            models.UniqueConstraint(
                fields=["contract", "sequence"],
                name="unique_installment_sequence_per_contract",
            )
        ]


class InstallmentPayment(AuditMixin):
    installment = models.ForeignKey(
        InstallmentSchedule,
        on_delete=models.PROTECT,
        related_name="installment_payments",
    )
    sales_payment = models.OneToOneField(
        SalesInvoicePayment,
        on_delete=models.PROTECT,
        related_name="installment_payment",
    )
    request_key = models.UUIDField(null=True, blank=True, unique=True, editable=False)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.CharField(max_length=150, null=True, blank=True)
    is_deleted = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Payment {self.id} - {self.installment}"

    class Meta:
        verbose_name = _("وصول قسط")
        verbose_name_plural = _("وصول اقساط")
        ordering = ["-created_at"]

