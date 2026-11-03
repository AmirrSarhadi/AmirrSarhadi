import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .validators import validate_listing_image
from kermancars.uploads import (
    listing_image_upload_to,
)

class ListingQuerySet(models.QuerySet):
    def active(self):
        """آگهی‌هایی که حذف نرم نشده‌اند."""
        return self.filter(deleted_at__isnull=True)

    def publicly_visible(self):
        """
        آگهی‌های عمومی:
        ۱. حذف نرم نشده باشند (Active)
        ۲. وضعیت آن‌ها PUBLISHED باشد
        ۳. زمان انقضای آن‌ها نرسیده باشد یا انقضا نداشته باشند
        """
        now = timezone.now()
        return self.active().filter(
            status=self.model.Status.PUBLISHED
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        )
    def with_promotion_state(self):
        now = timezone.now()

        active_feature = (
            models.Q(is_featured=True)
            & (
                models.Q(featured_until__isnull=True)
                | models.Q(featured_until__gt=now)
            )
        )

        return self.annotate(
            effective_is_featured=models.Case(
                models.When(active_feature, then=models.Value(True)),
                default=models.Value(False),
                output_field=models.BooleanField(),
            ),
            effective_featured_priority=models.Case(
                models.When(
                    active_feature,
                    then=models.F("featured_priority"),
                ),
                default=models.Value(0),
                output_field=models.PositiveSmallIntegerField(),
            ),
        )
    def delete(self):
        """
        جلوگیری از حذف فیزیکی هنگام استفاده از QuerySet.delete()
        """
        now = timezone.now()
        return self.update(
            deleted_at=now,
            inactive_at=now,
            status=self.model.Status.INACTIVE,
            updated_at=now,
            is_featured=False,
            featured_at=None,
            featured_until=None,
            featured_priority=0,
        )


# استفاده از from_queryset برای ارائه‌ی خودکار متدهای QuerySet روی Manager
class ActiveListingManager(models.Manager.from_queryset(ListingQuerySet)):
    def get_queryset(self):
        return super().get_queryset().active()


class AllListingManager(models.Manager.from_queryset(ListingQuerySet)):
    def get_queryset(self):
        return super().get_queryset()


class Listing(models.Model):
    class BodyStatus(models.TextChoices):
        SALIM = "SALIM", "سالم/بی‌رنگ"
        YEK_TIKE = "YEK_TIKE", "یک تکه رنگ"
        CHAND_TIKE = "CHAND_TIKE", "چند تکه رنگ"
        KAMEL_RANG = "KAMEL_RANG", "کامل رنگ"
        NIAZ_BE_TOZIH = "NIAZ_BE_TOZIH", "نیازمند توضیح"

    class Status(models.TextChoices):
        DRAFT = "draft", "پیش‌نویس"
        PENDING = "pending", "در انتظار بررسی"
        PUBLISHED = "published", "منتشر شده"
        REJECTED = "rejected", "رد شده"
        NEEDS_EDIT = "needs_edit", "نیازمند اصلاح"
        INACTIVE = "inactive", "غیرفعال"
        SOLD = "sold", "فروخته شده"

    class UsageType(models.TextChoices):
        PERSONAL = "personal", "شخصی"
        TAXI = "taxi", "تاکسی"
        COMPANY = "company", "شرکتی"
        OTHER = "other", "سایر"

    class EngineStatus(models.TextChoices):
        SALIM = "salim", "سالم"
        NEEDS_REPAIR = "needs_repair", "نیازمند تعمیر"
        REPLACED = "replaced", "تعویض شده"
        UNKNOWN = "unknown", "نامشخص"

    class TransmissionStatus(models.TextChoices):
        SALIM = "salim", "سالم"
        NEEDS_REPAIR = "needs_repair", "نیازمند تعمیر"
        REPLACED = "replaced", "تعویض شده"
        UNKNOWN = "unknown", "نامشخص"

    class ChassisStatus(models.TextChoices):
        SALIM = "salim", "سالم"
        MINOR_DAMAGE = "minor_damage", "ضربه جزئی"
        REPAIRED = "repaired", "تعمیر شده"
        DAMAGED = "damaged", "آسیب‌دیده"
        UNKNOWN = "unknown", "نامشخص"

    class DocumentStatus(models.TextChoices):
        COMPLETE = "complete", "کامل"
        INCOMPLETE = "incomplete", "ناقص"
        INHERITANCE = "inheritance", "انحصار وراثت"
        UNKNOWN = "unknown", "نامشخص"

    class PlateType(models.TextChoices):
        PERSONAL = "personal", "شخصی"
        GOVERNMENTAL = "governmental", "دولتی"
        TAXI = "taxi", "تاکسی"
        OTHER = "other", "سایر"

    class PriceType(models.TextChoices):
        FIXED = "fixed", "قطعی"
        NEGOTIABLE = "negotiable", "قابل مذاکره"
        CONTACT = "contact", "تماس بگیرید"
        INSTALLMENT = "installment", "اقساطی"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings",
        verbose_name="مالک آگهی",
    )

    city = models.ForeignKey(
        "locations.City",
        on_delete=models.PROTECT,
        related_name="listings",
        verbose_name="شهر",
    )

    neighborhood = models.ForeignKey(
        "locations.Neighborhood",
        on_delete=models.PROTECT,
        related_name="listings",
        verbose_name="محله",
        null=True,
        blank=True,
    )

    brand = models.ForeignKey(
        "cars.Brand",
        on_delete=models.PROTECT,
        related_name="listings",
        verbose_name="برند",
    )

    car_model = models.ForeignKey(
        "cars.CarModel",
        on_delete=models.PROTECT,
        related_name="listings",
        verbose_name="مدل خودرو",
    )

    trim = models.ForeignKey(
        "cars.CarTrim",
        on_delete=models.PROTECT,
        related_name="listings",
        null=True,
        blank=True,
        verbose_name="تیپ",
    )

    slug = models.SlugField(
        "شناسه URL",
        max_length=220,
        unique=True,
        blank=True,
        allow_unicode=True,
    )

    public_code = models.CharField(
        "کد عمومی",
        max_length=16,
        unique=True,
        editable=False,
        blank=True,
    )

    color = models.CharField(
        "رنگ بیرونی",
        max_length=50,
        blank=True,
        default="",
    )

    interior_color = models.CharField(
        "رنگ داخل",
        max_length=50,
        blank=True,
        default="",
    )

    usage_type = models.CharField(
        "نوع کاربری",
        max_length=20,
        choices=UsageType.choices,
        default=UsageType.PERSONAL,
    )

    engine_status = models.CharField(
        "وضعیت موتور",
        max_length=20,
        choices=EngineStatus.choices,
        default=EngineStatus.UNKNOWN,
    )

    transmission_status = models.CharField(
        "وضعیت گیربکس",
        max_length=20,
        choices=TransmissionStatus.choices,
        default=TransmissionStatus.UNKNOWN,
    )

    front_chassis_status = models.CharField(
        "وضعیت شاسی جلو",
        max_length=20,
        choices=ChassisStatus.choices,
        default=ChassisStatus.UNKNOWN,
    )

    rear_chassis_status = models.CharField(
        "وضعیت شاسی عقب",
        max_length=20,
        choices=ChassisStatus.choices,
        default=ChassisStatus.UNKNOWN,
    )

    owner_count = models.PositiveSmallIntegerField(
        "تعداد مالک",
        default=1,
    )

    document_status = models.CharField(
        "وضعیت سند",
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.UNKNOWN,
    )

    plate_type = models.CharField(
        "نوع پلاک",
        max_length=20,
        choices=PlateType.choices,
        default=PlateType.PERSONAL,
    )

    insurance_months = models.PositiveSmallIntegerField(
        "مدت بیمه به ماه",
        null=True,
        blank=True,
    )

    technical_inspection_valid_until = models.DateField(
        "اعتبار معاینه فنی تا",
        null=True,
        blank=True,
    )

    title = models.CharField(
        "عنوان آگهی",
        max_length=150,
    )

    description = models.TextField(
        "توضیحات",
        blank=True,
    )

    production_year = models.PositiveSmallIntegerField(
        "سال ساخت",
    )

    mileage = models.PositiveIntegerField(
        "کارکرد",
    )

    body_status = models.CharField(
        "وضعیت بدنه",
        max_length=20,
        choices=BodyStatus.choices,
        blank=True,
        default=BodyStatus.SALIM,
    )

    body_note = models.CharField(
        "توضیحات بدنه",
        max_length=255,
        blank=True,
        default="",
    )

    price_type = models.CharField(
        "نوع قیمت",
        max_length=20,
        choices=PriceType.choices,
        default=PriceType.FIXED,
    )

    price = models.PositiveBigIntegerField(
        "قیمت کل",
        null=True,
        blank=True,
    )

    is_exchangeable = models.BooleanField(
        "قابل معاوضه",
        default=False,
    )

    is_installment = models.BooleanField(
        "فروش اقساطی",
        default=False,
    )

    down_payment = models.PositiveBigIntegerField(
        "پیش‌پرداخت",
        null=True,
        blank=True,
    )

    installment_amount = models.PositiveBigIntegerField(
        "مبلغ هر قسط",
        null=True,
        blank=True,
    )

    installment_count = models.PositiveSmallIntegerField(
        "تعداد اقساط",
        null=True,
        blank=True,
    )

    installment_description = models.TextField(
        "توضیحات شرایط اقساط",
        blank=True,
        default="",
    )

    approximate_address = models.TextField(
        "آدرس تقریبی",
        blank=True,
        default="",
    )

    latitude = models.DecimalField(
        "عرض جغرافیایی",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        "طول جغرافیایی",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    hide_exact_location = models.BooleanField(
        "مخفی‌کردن موقعیت دقیق",
        default=True,
    )

    expires_at = models.DateTimeField(
        "زمان انقضای آگهی",
        null=True,
        blank=True,
    )

    sold_at = models.DateTimeField(
        "زمان فروش",
        null=True,
        blank=True,
    )

    paused_by_owner = models.BooleanField(default=False, verbose_name="توقف توسط مالک")

    inactive_at = models.DateTimeField(
        "زمان غیرفعال‌شدن",
        null=True,
        blank=True,
    )

    deleted_at = models.DateTimeField(
        "زمان حذف نرم",
        null=True,
        blank=True,
    )

    last_renewed_at = models.DateTimeField(
        "آخرین تمدید",
        null=True,
        blank=True,
    )

    is_featured = models.BooleanField(default=False)
    featured_at = models.DateTimeField(null=True, blank=True)
    featured_until = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="پایان ویژه بودن",
    )

    featured_priority = (
        models.PositiveSmallIntegerField(
            default=0,
            verbose_name="اولویت ویژه",
        )
    )
    
    last_bumped_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        "وضعیت",
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    published_at = models.DateTimeField(
        "تاریخ انتشار",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        "تاریخ ایجاد",
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        "تاریخ بروزرسانی",
        auto_now=True,
    )

    reviewed_at = models.DateTimeField(
        "زمان بررسی",
        null=True,
        blank=True,
    )

    rejection_reason = models.TextField(
        "دلیل رد",
        blank=True,
        default="",
    )

    needs_review = models.BooleanField(
        "نیازمند بررسی مجدد",
        default=False,
    )

    duplicate_of = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="duplicate_children",
        verbose_name="مشابه آگهی",
    )

    duplicate_score = models.PositiveSmallIntegerField(
        "امتیاز شباهت",
        default=0,
    )

    is_edited = models.BooleanField(
        "ویرایش‌شده پس از انتشار",
        default=False,
    )

    edited_at = models.DateTimeField(
        "زمان آخرین ویرایش مهم",
        null=True,
        blank=True,
    )

    # استفاده از مدیرهای سفارشی بدون تعریف‌های تکراری و متداخل
    objects = ActiveListingManager()
    all_objects = AllListingManager()

    SENSITIVE_FIELDS = [
        "price",
        "brand",
        "car_model",
        "body_status",
        "color",
        "description",
    ]

    class Meta:
        verbose_name = "آگهی"
        verbose_name_plural = "آگهی‌ها"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "deleted_at"]),
            models.Index(fields=["city", "status"]),
            models.Index(fields=["price_type", "status"]),
        ]

    def clean(self):
        errors = {}

        # ۱. اعتبارسنجی ساختار کاتالوگ خودرو (برند، مدل، تیپ)
        if (
            self.car_model_id
            and self.brand_id
            and self.car_model.brand_id != self.brand_id
        ):
            errors["car_model"] = "مدل انتخاب‌شده متعلق به این برند نیست."

        if (
            self.trim_id
            and self.car_model_id
            and self.trim.car_model_id != self.car_model_id
        ):
            errors["trim"] = "تیپ انتخاب‌شده متعلق به این مدل نیست."

        # ۲. اعتبارسنجی انطباق محله با شهر
        if self.neighborhood_id and self.city_id:
            if self.neighborhood.city_id != self.city_id:
                errors["neighborhood"] = "محله انتخاب‌شده متعلق به شهر آگهی نیست."

        # ۳. اعتبارسنجی قیمت و شرایط فروش
        self.is_installment = self.price_type == self.PriceType.INSTALLMENT

        if self.price_type == self.PriceType.CONTACT:
            self.price = None
        elif self.price is None or self.price <= 0:
            errors["price"] = "برای این نوع قیمت، وارد کردن قیمت معتبر الزامی است."

        if self.is_installment:
            if self.down_payment is None or self.down_payment <= 0:
                errors["down_payment"] = (
                    "برای فروش اقساطی، پیش‌پرداخت معتبر الزامی است."
                )
            elif self.price and self.down_payment >= self.price:
                errors["down_payment"] = (
                    "مبلغ پیش‌پرداخت نمی‌تواند بیشتر یا مساوی قیمت کل باشد."
                )

            if (
                self.installment_amount is None
                or self.installment_amount <= 0
            ):
                errors["installment_amount"] = (
                    "برای فروش اقساطی، مبلغ هر قسط باید بیشتر از صفر باشد."
                )

            if (
                self.installment_count is None
                or self.installment_count <= 0
            ):
                errors["installment_count"] = (
                    "برای فروش اقساطی، تعداد اقساط باید بیشتر از صفر باشد."
                )

        # ۴. اعتبارسنجی مختصات جغرافیایی
        if self.latitude is not None:
            if not (25.0 <= float(self.latitude) <= 40.0):
                errors["latitude"] = (
                    "عرض جغرافیایی وارد شده خارج از محدوده "
                    "جغرافیایی معتبر ایران است."
                )

        if self.longitude is not None:
            if not (44.0 <= float(self.longitude) <= 64.0):
                errors["longitude"] = (
                    "طول جغرافیایی وارد شده خارج از محدوده "
                    "جغرافیایی معتبر ایران است."
                )

        # ۵. اعتبارسنجی مدت بیمه
        # صفر یعنی بیمه منقضی شده و مقدار معتبری است.
        if (
            self.insurance_months is not None
            and not (0 <= self.insurance_months <= 12)
        ):
            errors["insurance_months"] = (
                "مدت بیمه باید بین ۰ تا ۱۲ ماه باشد."
            )

        if errors:
            raise ValidationError(errors)

    def _generate_public_code(self):
        return uuid.uuid4().hex[:8].lower()

    def _generate_slug(self):
        parts = [
            self.brand.name if self.brand_id else "",
            self.car_model.name if self.car_model_id else "",
            self.trim.name if self.trim_id else "",
            "krm",
            self.public_code,
        ]

        value = "-".join(str(part) for part in parts if part)
        return slugify(value, allow_unicode=True)[:220]
    @property
    def has_active_feature(self):
        annotated_value = getattr(
            self,
            "effective_is_featured",
            None,
        )

        if annotated_value is not None:
            return bool(annotated_value)

        return bool(
            self.is_featured
            and (
                self.featured_until is None
                or self.featured_until > timezone.now()
            )
        )
    def save(self, *args, **kwargs):
        was_published = False

        if self.pk:
            # استفاده از all_objects چون ممکن است آگهی غیرفعال یا حذف‌شده باشد که می‌خواهیم بررسی کنیم
            old_instance = (
                Listing.all_objects
                .filter(pk=self.pk)
                .only("status", *self.SENSITIVE_FIELDS)
                .first()
            )

            if old_instance:
                was_published = old_instance.status == self.Status.PUBLISHED

                if was_published:
                    for field in self.SENSITIVE_FIELDS:
                        if getattr(self, field) != getattr(old_instance, field):
                            self.status = self.Status.PENDING
                            self.is_edited = True
                            self.edited_at = timezone.now()
                            break

        if not self.public_code:
            for _ in range(10):
                candidate = self._generate_public_code()

                if not Listing.all_objects.filter(
                    public_code=candidate
                ).exists():
                    self.public_code = candidate
                    break
            else:
                raise ValidationError({
                    "public_code": (
                        "تولید کد عمومی یکتا ناموفق بود؛ دوباره تلاش کنید."
                    )
                })

        if not self.slug:
            self.slug = self._generate_slug()
        self.full_clean()
        super().save(*args, **kwargs)

    def mark_as_sold(self):
        """
        علامت‌گذاری آگهی منتشرشده به‌عنوان فروخته‌شده.
        اجرای چندباره این متد امن است.
        """
        if self.status == self.Status.SOLD:
            return False

        now = timezone.now()

        self.status = self.Status.SOLD
        self.sold_at = now
        self.inactive_at = now
        self.is_featured = False
        self.featured_at = None
        self.featured_until = None
        self.featured_priority = 0

        self.save(
            update_fields=[
                "status",
                "sold_at",
                "inactive_at",
                "is_featured",
                "featured_at",
                "updated_at",
                "featured_until",
                "featured_priority",
            ]
        )

        return True

    def delete(self, using=None, keep_parents=False):
        """
        حذف نرم آگهی بدون حذف واقعی رکورد از دیتابیس.
        """
        if self.pk is None:
            return (0, {})

        now = timezone.now()

        updated = (
            Listing.all_objects
            .filter(
                pk=self.pk,
                deleted_at__isnull=True,
            )
            .update(
                deleted_at=now,
                inactive_at=now,
                status=self.Status.INACTIVE,
                updated_at=now,
                is_featured=False,
                featured_at=None,
                featured_until=None,
                featured_priority=0,
            )
        )

        if updated:
            self.deleted_at = now
            self.inactive_at = now
            self.status = self.Status.INACTIVE
            self.updated_at = now
            self.is_featured = False
            self.featured_at = None
            self.featured_until = None
            self.featured_priority = 0

        return (
            updated,
            {
                self._meta.label: updated,
            },
        )

    def restore(self):
        """
        بازیابی آگهی soft-deleted شده.
        """
        self.deleted_at = None
        self.inactive_at = None

        if self.status == self.Status.INACTIVE:
            self.status = self.Status.DRAFT

        self.save(
            update_fields=[
                "deleted_at",
                "inactive_at",
                "status",
                "updated_at",
                "is_featured",
                "featured_at",
                "featured_until",
                "featured_priority",
            ]
        )

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def __str__(self):
        return self.title


class ListingImage(models.Model):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name="آگهی",
    )
    image = models.ImageField(
        upload_to=listing_image_upload_to,
        validators=[validate_listing_image],
        verbose_name="تصویر",
    )
    is_cover = models.BooleanField(
        default=False,
        verbose_name="تصویر اصلی",
    )
    order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="ترتیب",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاریخ ایجاد",
    )

    class Meta:
        verbose_name = "تصویر آگهی"
        verbose_name_plural = "تصاویر آگهی"
        ordering = ["order", "id"]

    def clean(self):
        if self.listing_id:
            existing_count = self.listing.images.exclude(pk=self.pk).count()
            if (
                existing_count
                >= settings.LISTING_MAX_IMAGES
            ):
                raise ValidationError({
                    "image": (
                        "هر آگهی حداکثر "
                        f"{settings.LISTING_MAX_IMAGES} "
                        "تصویر می‌تواند داشته باشد."
                    )
                })

        if self.is_cover and self.listing_id:
            qs = self.listing.images.exclude(pk=self.pk).filter(is_cover=True)
            if qs.exists():
                raise ValidationError(
                    {"is_cover": "برای هر آگهی فقط یک تصویر اصلی مجاز است."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"تصویر آگهی {self.listing_id}"
