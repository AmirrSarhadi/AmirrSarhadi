from django.db import models
from django.utils.translation import gettext_lazy as _
from .utils import now_tehran
from django.conf import settings

class material_group(models.Model):
    code = models.BigIntegerField(unique=True)
    name = models.CharField(max_length=50, unique=True)
    image = models.ImageField(
        upload_to='Services/static/images/commodity_group_img/')
    description = models.CharField(max_length=200)
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
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("گروه کالا")
        verbose_name_plural = _("گروه های کالاها")


class material_category(models.Model):
    code = models.IntegerField(unique=True)
    name = models.CharField(max_length=50, unique=True)
    image = models.ImageField(
        upload_to='Services/static/images/commodity_group_img/')
    description = models.CharField(max_length=200)
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
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("دسته بندی کالا")
        verbose_name_plural = _("دسته بندی های کالاها")


class material_brand(models.Model):
    code = models.IntegerField(unique=True)
    name = models.CharField(max_length=50, unique=True)
    image = models.ImageField(
        upload_to='Services/static/images/commodity_group_img/')
    description = models.CharField(max_length=200)
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
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("برند کالا")
        verbose_name_plural = _("برندهای کالاها")


class material(models.Model):

    sku_code = models.CharField(
    max_length=100,
    unique=True
    )
    accounting_code = models.BigIntegerField(unique=True)
    persian_name = models.CharField(max_length=50, unique=True)
    english_name = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True
    )    
    description = models.CharField(max_length=100)
    qrcode = models.ImageField(
        upload_to='Services/static/images/qr_codes/', unique=True, null=True)
    barcode = models.BigIntegerField()
    serial_code = models.CharField(max_length=100)
    material_group_name = models.ForeignKey(
        material_group, on_delete=models.CASCADE)
    material_category_name = models.ForeignKey(
        material_category, on_delete=models.CASCADE)
    material_brand_name = models.ForeignKey(
        material_brand, on_delete=models.CASCADE)
    main_currency = models.CharField(max_length=20, help_text="واحد پول")
    secondary_currency = models.CharField(max_length=20, blank=True, null=True)
    Conversion_factor_currency = models.CharField(
        max_length=20, blank=True, null=True)
    currency_description = models.CharField(
        max_length=200, blank=True, null=True)
    initial_inventory = models.BigIntegerField(
        "موجودی اولیه انبار", null=True, blank=True)
    unit_selling_price = models.BigIntegerField("قیمت فروش هر واحد")
    selling_description = models.CharField(
        max_length=200, blank=True, null=True)
    unit_buying_price = models.BigIntegerField("قیمت خرید هر واحد")
    buying_description = models.CharField(
        max_length=200, blank=True, null=True)
    weight = models.BigIntegerField()
    length = models.BigIntegerField()
    width = models.BigIntegerField()
    height = models.BigIntegerField()
    shortage_threshold = models.BigIntegerField("آستانه کمبود")
    step_sell = models.BigIntegerField("حداقل سفارش")
    min_order = models.BigIntegerField("تعداد دقیق اضافه شدن به هر سفارش")
    max_order = models.BigIntegerField("محدودیت سفارش")
    material_vendor = models.ForeignKey(
        "Persons.vendor", on_delete=models.CASCADE)
    tax_percent = models.BigIntegerField(null=True, blank=True, default=0)
    tax_value = models.BigIntegerField(null=True, blank=True, default=0)
    charges = models.BigIntegerField("عوارض")
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
    is_deleted = models.PositiveBigIntegerField(
        verbose_name=_('پاک شده'), default=0)

    def __str__(self):
        return (
            self.english_name
            or self.persian_name
            or self.sku_code
        )
    
    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("کالا")
        verbose_name_plural = _("کالاها")


class MaterialSellingPrice(models.Model):
    material = models.ForeignKey(
        material, on_delete=models.CASCADE, related_name="selling_prices"
    )
    level = models.IntegerField()  # 1,2,3,4
    price = models.BigIntegerField()

    created_at = models.DateTimeField(default=now_tehran)

    def __str__(self):
        return f"{self.material.persian_name} - Level {self.level}"

    class Meta:
        unique_together = ('material', 'level')

class MaterialDiscount(models.Model):
    DISCOUNT_TARGET_CHOICES = [
        ('seller', 'فروشنده'),
        ('event', 'رویداد'),
        ('customer', 'مشتری خاص'),
    ]

    material = models.ForeignKey(
        material, on_delete=models.CASCADE, related_name='discounts')
    title = models.CharField(
        max_length=100, help_text="عنوان تخفیف مثل فروش ویژه یا تخفیف فروشنده")
    target_type = models.CharField(
        max_length=20, choices=DISCOUNT_TARGET_CHOICES)
    target_id = models.BigIntegerField(
        blank=True, null=True, help_text="شناسه هدف مثل id فروشنده یا مشتری")
    discount_percent = models.FloatField(default=0)
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)

    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)

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
    is_deleted = models.PositiveBigIntegerField(
        verbose_name=_('پاک شده'), default=0)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.title} - {self.material.persian_name}"
    
    def save(self, *args, **kwargs):
        # if object already exists → treat as update: only then set updated_at
        if self.pk is not None:
            self.updated_at = now_tehran()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = _("تخفیف")
        verbose_name_plural = _("تخفیف‌ها")


#____________________services_______________________


class services_category(models.Model):
    code = models.IntegerField(unique=True)
    name = models.CharField(max_length=50, unique=True)
    image = models.ImageField(upload_to='Services/static/images/commodity_group_img/', null=True, blank=True)
    description = models.CharField(max_length=200)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = _("دسته بندی خدمت")
        verbose_name_plural = _("دسته بندی های خدمات")
    
class services(models.Model):
    class TAX_TYPE(models.TextChoices):
        MEDICINE = 'دارو'
        TOBACCO = 'دخانیات'
        MOBILE = 'موبایل'
        ELECTRO_DEVICE = 'لوازم خانگی برقی'
        STUFF = 'قطعات مصرفی و یدکی وسایل نقلیه'
        OILSANDGAS = 'فراورده‌ها و مشتقات نفتی، گازی و پتروشیمی'
        GOLD = 'طلا اعم از شمش، مسکوکات و مصنوعات زینتی'
        CLOTH = 'منسوجات و پوشاک'
        TOY = 'اسباب بازی'
        ANIMALS_AND_MEET = 'دام زنده، گوشت سفید و قرمز'
        FARMING = 'محصولات اساسی کشاورزی'
        OTHERS = 'سایر کالاها'

    class TAX_UNIT(models.TextChoices):
        BANKE = 'بانکه'
        BARG = 'برگ'
        BASTE = 'بسته'
        BOTRI = 'بطری'
        

    accounting_code = models.BigIntegerField(unique=True)
    code = models.BigIntegerField(unique=True)
    persian_name = models.CharField(max_length=50, unique=True)
    english_name = models.CharField(max_length=50, unique=True, null=True, blank=True)
    image = models.ImageField(upload_to='Services/static/images/commodity_group_img/', null=True, blank=True)
    description = models.CharField(max_length=100)
    barcode = models.BigIntegerField()
    services_category_name = models.ForeignKey(services_category, on_delete=models.CASCADE)
    service_selling_price= models.BigIntegerField("قیمت فروش هر واحد")
    service_selling_description = models.CharField(max_length=200, blank=True, null=True)
    service_buying_price= models.BigIntegerField("قیمت خرید هر واحد")
    service_buying_description = models.CharField(max_length=200, blank=True, null=True)
    countingـunit = models.CharField(max_length=20,help_text="واحد شمارش")
    countingـunit_description = models.CharField(max_length=200, blank=True, null=True)

    selling_tax = models.BooleanField(default=False)
    selling_tax_value = models.BigIntegerField(null=True , blank=True, default=0)
    selling_tax_type = models.CharField(
        verbose_name=_('نوع مالیات'),
        choices=TAX_TYPE.choices,
        default=TAX_TYPE.OTHERS,
        max_length=255,
    )
    selling_tax_unit = models.CharField(
        verbose_name=_('نوع مالیات'),
        choices=TAX_UNIT.choices,
        default=TAX_UNIT.BARG,
        max_length=255,
    )

    buying_tax = models.BooleanField(default=False)
    buying_tax_value = models.BigIntegerField(null=True , blank=True, default=0)
    tax_code = models.BigIntegerField(null=True , blank=True, default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )
    updated_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)


    def __str__(self):
        return self.persian_name
    
    class Meta:
        verbose_name = _("خدمت")
        verbose_name_plural = _("خدمات")
    