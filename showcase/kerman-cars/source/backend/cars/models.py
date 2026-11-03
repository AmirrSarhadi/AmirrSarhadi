from django.db import models


class BodyTypeChoices(models.TextChoices):
    SEDAN = "sedan", "سدان"
    HATCHBACK = "hatchback", "هاچ‌بک"
    SUV = "suv", "شاسی‌بلند"
    CROSSOVER = "crossover", "کراس‌اوور"
    PICKUP = "pickup", "پیکاپ"
    VAN = "van", "ون"
    COUPE = "coupe", "کوپه"
    CONVERTIBLE = "convertible", "کروک"
    WAGON = "wagon", "استیشن"


class FuelTypeChoices(models.TextChoices):
    GASOLINE = "gasoline", "بنزینی"
    DIESEL = "diesel", "دیزلی"
    HYBRID = "hybrid", "هیبریدی"
    ELECTRIC = "electric", "برقی"
    CNG = "cng", "دوگانه‌سوز"


class TransmissionChoices(models.TextChoices):
    MANUAL = "manual", "دستی"
    AUTOMATIC = "automatic", "اتومات"
    CVT = "cvt", "CVT"
    DCT = "dct", "DCT"


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="نام برند")
    logo = models.ImageField(
        upload_to="brands/logos/",
        null=True,
        blank=True,
        verbose_name="لوگو",
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    sort_order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "برند"
        verbose_name_plural = "برندها"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class CarModel(models.Model):
    brand = models.ForeignKey(
        Brand,
        on_delete=models.PROTECT,
        related_name="models",
        verbose_name="برند",
    )
    name = models.CharField(max_length=100, verbose_name="نام مدل")
    body_type = models.CharField(
        max_length=20,
        choices=BodyTypeChoices.choices,
        blank=True,
        verbose_name="نوع بدنه",
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    sort_order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "مدل خودرو"
        verbose_name_plural = "مدل‌های خودرو"
        ordering = ["brand__name", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["brand", "name"],
                name="uniq_car_model_name_per_brand",
            ),
        ]

    def __str__(self):
        return self.name

class CarTrim(models.Model):
    car_model = models.ForeignKey(
        CarModel,
        on_delete=models.PROTECT,
        related_name="trims",
        verbose_name="مدل خودرو",
    )
    name = models.CharField(max_length=100, verbose_name="نام تیپ")
    engine_volume = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name="حجم موتور",
        help_text="مثلاً 1.6",
    )
    fuel_type = models.CharField(
        max_length=20,
        choices=FuelTypeChoices.choices,
        blank=True,
        verbose_name="نوع سوخت",
    )
    transmission = models.CharField(
        max_length=20,
        choices=TransmissionChoices.choices,
        blank=True,
        verbose_name="گیربکس",
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    sort_order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "تیپ خودرو"
        verbose_name_plural = "تیپ‌های خودرو"
        ordering = ["car_model__brand__name", "car_model__name", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["car_model", "name"],
                name="uniq_trim_name_per_model",
            ),
        ]

    def __str__(self):
        return self.name
