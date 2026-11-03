from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django_jalali.db import models as jmodels
from Others.models import price_list, tax
from django.utils.translation import gettext_lazy as _
from .utils import now_tehran
from Accounting.models import DetailAccount
from django.conf import settings
class BasePerson(models.Model):
    PERSON_TYPES = [
        ('حقوقی', 'حقوقی'),
        ('حقیقی', 'حقیقی'),
    ]

    # Common fields
    code = models.IntegerField(unique=True)
    first_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50, blank=True, null=True)
    company = models.CharField(max_length=50, blank=True, null=True)
    type = models.CharField(max_length=10, choices=PERSON_TYPES, default='حقیقی')
    image = models.ImageField(upload_to='Persons/static/images/person_images/', blank=True, null=True)
    is_active = models.BooleanField(default=True)

    # connect to accounting detail account
    accounting_detail = models.ForeignKey(
    DetailAccount,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="%(class)s_persons",
    verbose_name=_("تفصیل حسابداری"),
    )

    # Contact information
    address = models.CharField(max_length=200, blank=True, null=True)
    country = models.CharField(max_length=20, blank=True, null=True)
    state = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=20, blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    mobile = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    # Dates
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(default=now_tehran, editable=False, verbose_name=_('تاریخ ایجاد'))
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ ویرایش'))
    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))

    def save(self, *args, **kwargs):
            # if object already exists → treat as update: only then set updated_at
            if self.pk is not None:
                self.updated_at = now_tehran()
            super().save(*args, **kwargs)
    class Meta:
        abstract = True

    def __str__(self):
        if self.company:
            return self.company
        return f"{self.first_name} {self.last_name}"


class Customer(BasePerson):
    # Customer specific fields
    financial_credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    national_code = models.CharField(max_length=10, unique=True, blank=True, null=True)
    referral_code = models.CharField(max_length=20, blank=True, null=True)
    birthday_date = jmodels.jDateField(null=True, blank=True)
    is_vip = models.BooleanField(default=False)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    description = models.CharField(max_length=200,null=True,blank=True)
    owner = models.CharField("نام مالک", max_length=50,null=True,blank=True)



    def save(self, *args, **kwargs):
            # if object already exists → treat as update: only then set updated_at
            if self.pk is not None:
                self.updated_at = now_tehran()
            super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("مشتری")
        verbose_name_plural = _("مشتری‌ها")


class Vendor(BasePerson):
    # Vendor specific fields
    eco_code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    reg_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    national_code = models.CharField(max_length=10, unique=True, blank=True, null=True)
    birthday_date = jmodels.jDateField(null=True, blank=True)
    tax_id = models.CharField(max_length=20, blank=True, null=True)
    description = models.CharField(max_length=200,null=True,blank=True)
    owner = models.CharField("نام مالک", max_length=50,null=True,blank=True)

    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)
    class Meta:
        verbose_name = _("تأمین‌کننده")
        verbose_name_plural = _("تأمین‌کننده‌ها")


class Seller(BasePerson):
    # Seller specific fields
    selling_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sell_back_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sales_target = models.IntegerField(default=0)
    hire_date = jmodels.jDateField(null=True, blank=True)
    national_id = models.CharField(max_length=10, unique=True, blank=True, null=True)
    expense_account = models.CharField(max_length=150, blank=True, null=True)
    total_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    recording_commission = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)
    class Meta:
        verbose_name = _("فروشنده")
        verbose_name_plural = _("فروشنده‌ها")


class Staff(BasePerson):
    # Staff specific fields
    position = models.CharField(max_length=50, blank=True, null=True)
    department = models.CharField(max_length=50, blank=True, null=True)
    hire_date = jmodels.jDateField(null=True, blank=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    national_id = models.CharField(max_length=10, unique=True, blank=True, null=True)

    user_account = models.OneToOneField(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_profile'
    )

    is_manager = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)
    class Meta:
        verbose_name = _("کارمند")
        verbose_name_plural = _("کارمندها")


# Create proxy models for relationships

class BankAccount(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    bank_account_owner = GenericForeignKey('content_type', 'object_id')
    bank_name = models.CharField(max_length=50)
    account_number = models.CharField(max_length=30, unique=True)
    account_title = models.CharField(max_length=100)
    iban = models.CharField(max_length=30, blank=True, null=True)
    is_default = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(default=now_tehran, editable=False, verbose_name=_('تاریخ ایجاد'))
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ ویرایش'))
    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))

    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.bank_name} - {self.account_number}"

    class Meta:
        verbose_name = _("حساب بانکی")
        verbose_name_plural = _("حساب‌های بانکی")


class ShareHolder(BasePerson):
    share_precent = models.DecimalField(verbose_name=_('درصد سهم'), max_digits=5, decimal_places=2, default=0)
    owner = models.CharField("نام مالک", max_length=50,null=True,blank=True)


    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} {self.share_precent}"

    class Meta:
        verbose_name = _("سهام دار")
        verbose_name_plural = _("سهام داران")


class Cheque(models.Model):
    class Currency(models.TextChoices):
        USD = 'دلار آمریکا'
        AED = 'درهم امارات متحده عربی'
        CAD = 'دلار کانادا'
        EUR = 'یورو'
        IRR = 'ریال ایران'
        OMR = 'ریال عمان'

    class ChequeType(models.TextChoices):
        IN = 'دریافتی', 'دریافتی'
        OUT = 'پرداختی', 'پرداختی'

    class ChequeStatus(models.TextChoices):
        PENDING = 'PENDING', 'در جریان'
        DEPOSITED = 'DEPOSITED', 'واگذار شده به بانک'
        CLEARED = 'CLEARED', 'وصول شده'
        SPENT = 'SPENT', 'خرج شده'
        RETURNED = 'RETURNED', 'برگشتی'
        CANCELED = 'CANCELED', 'ابطال شده'

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='cheques'
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    payer = GenericForeignKey('content_type', 'object_id')

    cheque_type = models.CharField(
        max_length=20,
        choices=ChequeType.choices,
        default=ChequeType.IN,
        verbose_name=_('نوع چک')
    )

    status = models.CharField(
        max_length=20,
        choices=ChequeStatus.choices,
        default=ChequeStatus.PENDING,
        db_index=True,
        verbose_name=_('وضعیت چک')
    )

    sayad_number = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name=_('شماره صیاد')
    )

    number = models.CharField(
        max_length=50,
        verbose_name=_('شماره چک'),
        null=True,
        blank=True,
        db_index=True,
    )

    currency = models.CharField(
        max_length=22,
        verbose_name=_('واحد پول'),
        choices=Currency.choices,
        default=Currency.IRR,
    )

    amount = models.BigIntegerField(
        verbose_name=_('مبلغ'),
        default=0,
        null=True,
        blank=True
    )

    bank_name = models.CharField(
        max_length=255,
        verbose_name=_('بانک صادرکننده چک'),
        null=True,
        blank=True
    )

    bank_branch = models.CharField(
        max_length=255,
        verbose_name=_('شعبه'),
        null=True,
        blank=True
    )

    date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('تاریخ سررسید')
    )

    received_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('تاریخ دریافت / صدور')
    )

    settled_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('تاریخ وصول / پاس شدن')
    )

    settlement_bank = models.ForeignKey(
        "Banking.Bank",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settled_cheques",
        verbose_name=_("بانک وصول / پرداخت")
    )

    spent_to_content_type = models.ForeignKey(
    ContentType,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="spent_cheques",
    verbose_name="نوع شخص دریافت‌کننده چک خرج‌شده",
    )

    spent_to_object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="شناسه شخص دریافت‌کننده چک خرج‌شده",
    )

    spent_to = GenericForeignKey(
        "spent_to_content_type",
        "spent_to_object_id",
    )

    spent_at = models.DateField(
        null=True,
        blank=True,
        verbose_name="تاریخ خرج شدن چک",
    )

    accounting_document = models.ForeignKey(
        "Accounting.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cheque_documents",
        verbose_name=_("سند حسابداری ثبت چک")
    )

    settlement_document = models.ForeignKey(
        "Accounting.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cheque_settlement_documents",
        verbose_name=_("سند حسابداری وصول / پاس شدن")
    )

    reverse_document = models.ForeignKey(
        "Accounting.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cheque_reverse_documents",
        verbose_name=_("سند ابطال / برگشت چک")
    )

    source_app = models.CharField(max_length=50, null=True, blank=True)
    source_model = models.CharField(max_length=80, null=True, blank=True)
    source_id = models.PositiveIntegerField(null=True, blank=True)

    description = models.TextField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(default=now_tehran, editable=False, verbose_name=_('تاریخ ایجاد'))
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ ویرایش'))
    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))

    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    @property
    def payer_name(self):
        if not self.payer:
            return None

        return (
            getattr(self.payer, "company", None)
            or f"{getattr(self.payer, 'first_name', '') or ''} {getattr(self.payer, 'last_name', '') or ''}".strip()
            or str(self.payer)
        )

    def __str__(self):
        return f"{self.get_cheque_type_display()} - {self.number or self.sayad_number} - {self.amount}"

    class Meta:
        verbose_name = _('چک')
        verbose_name_plural = _('چک‌ها')

class Drivers(BasePerson):
    licence_code = models.BigIntegerField(verbose_name=_('شماره گواهینامه'))
    national_code = models.BigIntegerField(verbose_name=_('کد ملی'))

    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name}"

    class Meta:
        verbose_name = _("راننده")
        verbose_name_plural = _("رانندگان")


class Account(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    account_owner = GenericForeignKey('content_type', 'object_id')
    amount = models.PositiveIntegerField(default=0, verbose_name=_('مبلغ'))
    reference = models.CharField(max_length=255, null=True, blank=True, verbose_name=_('ارجاع'))
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(default=now_tehran, editable=False, verbose_name=_('تاریخ ایجاد'))
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ ویرایش'))
    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))


class GetPaid(models.Model):
    class Currency(models.TextChoices):
        IRR = 'ریال ایران'
        CAD = 'دلار کانادا'
        EUR = 'یورو'
        USD = 'دلار آمریکا'
        AED = 'درهم امارات عربی'
        OMR = 'ریال عمان'

    get_paid_number = models.BigIntegerField(verbose_name=_('شماره دریافت'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ دریافت'))
    description = models.TextField(null=True, blank=True, verbose_name=_('شرح دریافت'))
    currency = models.CharField(
        max_length=255,
        choices=Currency.choices,
        default=Currency.IRR,
        null=True,
        blank=True,
        verbose_name=_('واحد پول')
    )

    getpaid_person_ct = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True, related_name='getpaid_person'
    )
    getpaid_person_object_id = models.PositiveIntegerField(null=True, blank=True)
    person = GenericForeignKey('getpaid_person_ct', 'getpaid_person_object_id')
    amount = models.BigIntegerField(null=True, blank=True, verbose_name=_('مبلغ'))
    receiver_content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True, related_name='getpaid_receiver'
    )
    receiver_object_id = models.PositiveIntegerField(null=True, blank=True)
    receiver = GenericForeignKey('receiver_content_type', 'receiver_object_id')
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(default=now_tehran, editable=False, verbose_name=_('تاریخ ایجاد'))
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ ویرایش'))
    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))

    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_paid_number} - {self.date} - {self.person} - {self.amount} --> {self.receiver}"

    class Meta:
        verbose_name = _('دریافت')
        verbose_name_plural = _('دریافت ها')


class GetPaidItem(models.Model):
    RECEIVE_DEST_TYPES = [
        ('bank', 'بانک'),
        ('cashbox', 'صندوق'),
        ('imprest', 'تنخواه‌گردان'),
        ('cheque', 'چک'),
    ]

    getpaid = models.ForeignKey(
        GetPaid,
        on_delete=models.CASCADE,
        related_name='items'
    )

    getpaid_person_ct = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='getpaid_items_as_person'
    )
    getpaid_person_object_id = models.PositiveIntegerField()
    person = GenericForeignKey('getpaid_person_ct', 'getpaid_person_object_id')

    receiver_type = models.CharField(max_length=20, choices=RECEIVE_DEST_TYPES)
    receiver_id = models.PositiveIntegerField()

    amount = models.BigIntegerField(verbose_name='مبلغ')
    bank_fees = models.BigIntegerField(default=0, verbose_name='کارمزد بانکی')
    reference = models.CharField(max_length=100, blank=True, null=True, verbose_name='ارجاع')
    description = models.TextField(blank=True, null=True, verbose_name='شرح')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(default=now_tehran, editable=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.person} → {self.receiver_type} ({self.amount})"

    class Meta:
        verbose_name = _('آیتم دریافت')
        verbose_name_plural = _('آیتم‌های دریافت')




class Payment(models.Model):
    class Currency(models.TextChoices):
        IRR = 'ریال ایران'
        CAD = 'دلار کانادا'
        EUR = 'یورو'
        USD = 'دلار آمریکا'
        AED = 'درهم امارات عربی'
        OMR = 'ریال عمان'

    payment_number = models.BigIntegerField(verbose_name=_('شماره پرداخت'))
    date = models.DateField(null=True, blank=True, verbose_name=_('تاریخ پرداخت'))
    description = models.TextField(null=True, blank=True, verbose_name=_('شرح پرداخت'))
    currency = models.CharField(
        max_length=255,
        choices=Currency.choices,
        default=Currency.IRR,
        null=True,
        blank=True,
        verbose_name=_('واحد پول')
    )

    # فردی که پرداخت را انجام می‌دهد (مثلاً کارمند)
    payer_person_ct = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True, related_name='payments_made'
    )
    payer_person_object_id = models.PositiveIntegerField(null=True, blank=True)
    payer = GenericForeignKey('payer_person_ct', 'payer_person_object_id')

    # مقصد دریافت پرداخت (مثلاً بانک، صندوق، تنخواه‌گردان)
    receiver_content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True, related_name='payments_received'
    )
    receiver_object_id = models.PositiveIntegerField(null=True, blank=True)
    receiver = GenericForeignKey('receiver_content_type', 'receiver_object_id')

    amount = models.BigIntegerField(null=True, blank=True, verbose_name=_('مبلغ'))

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(default=now_tehran, editable=False, verbose_name=_('تاریخ ایجاد'))
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ ویرایش'))
    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))

    def save(self, *args, **kwargs):
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"پرداخت {self.amount} از {self.payer} به {self.receiver}"

    class Meta:
        verbose_name = _('پرداخت')
        verbose_name_plural = _('پرداخت ها')

# Persons/models.py

class PaymentItem(models.Model):
    PAYMENT_DEST_TYPES = [
        ('bank', 'بانک'),
        ('cashbox', 'صندوق'),
        ('imprest', 'تنخواه‌گردان'),
        ('cheque', 'چک'),
    ]

    payment = models.ForeignKey(
        Payment, on_delete=models.CASCADE, related_name='items'
    )
    # شخص پرداخت‌کننده
    payer_person_ct = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, related_name='payment_items_as_payer'
    )
    payer_person_object_id = models.PositiveIntegerField()
    payer = GenericForeignKey('payer_person_ct', 'payer_person_object_id')

    # مقصد پرداخت
    receiver_type = models.CharField(max_length=20, choices=PAYMENT_DEST_TYPES)
    receiver_id = models.PositiveIntegerField()  # ID مقصد (مثلاً bank.id)

    amount = models.BigIntegerField(verbose_name='مبلغ')
    bank_fees = models.BigIntegerField(default=0, verbose_name='کارمزد بانکی')
    reference = models.CharField(max_length=100, blank=True, null=True, verbose_name='ارجاع')
    description = models.TextField(blank=True, null=True, verbose_name='شرح')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(default=now_tehran, editable=False, verbose_name=_('تاریخ ایجاد'))
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاریخ ویرایش'))
    is_deleted = models.PositiveIntegerField(default=0, verbose_name=_('حذف شده'))
    
    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.payer} → {self.receiver_type} (مبلغ: {self.amount})"