from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


class BannerQuerySet(models.QuerySet):
    def currently_visible(self, at=None):
        at = at or timezone.now()

        return (
            self.filter(is_active=True)
            .filter(
                Q(starts_at__isnull=True)
                | Q(starts_at__lte=at)
            )
            .filter(
                Q(ends_at__isnull=True)
                | Q(ends_at__gt=at)
            )
        )


class Banner(models.Model):
    class Position(models.TextChoices):
        HERO = "hero", "بنر اصلی"
        TOP = "top", "بالای صفحه"
        MIDDLE = "middle", "میانه صفحه"
        SIDEBAR = "sidebar", "کنار صفحه"

    title = models.CharField(
        "عنوان",
        max_length=150,
        blank=True,
        default="",
    )
    subtitle = models.CharField(
        "زیرعنوان",
        max_length=255,
        blank=True,
        default="",
    )
    image = models.ImageField(
        "تصویر دسکتاپ",
        upload_to="homepage/banners/",
    )
    mobile_image = models.ImageField(
        "تصویر موبایل",
        upload_to="homepage/banners/mobile/",
        blank=True,
        null=True,
    )
    alt_text = models.CharField(
        "متن جایگزین تصویر",
        max_length=150,
        blank=True,
        default="",
    )
    link_url = models.URLField(
        "لینک بنر",
        blank=True,
        default="",
    )
    open_in_new_tab = models.BooleanField(
        "بازشدن در صفحه جدید",
        default=False,
    )
    position = models.CharField(
        "محل نمایش",
        max_length=20,
        choices=Position.choices,
        default=Position.HERO,
        db_index=True,
    )
    is_active = models.BooleanField(
        "فعال",
        default=True,
        db_index=True,
    )
    starts_at = models.DateTimeField(
        "شروع نمایش",
        null=True,
        blank=True,
    )
    ends_at = models.DateTimeField(
        "پایان نمایش",
        null=True,
        blank=True,
    )
    sort_order = models.PositiveIntegerField(
        "ترتیب نمایش",
        default=0,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    objects = BannerQuerySet.as_manager()

    class Meta:
        ordering = [
            "position",
            "sort_order",
            "-created_at",
        ]
        indexes = [
            models.Index(
                fields=[
                    "position",
                    "is_active",
                    "sort_order",
                ],
            ),
            models.Index(
                fields=[
                    "starts_at",
                    "ends_at",
                ],
            ),
        ]

    def clean(self):
        super().clean()

        if (
            self.starts_at
            and self.ends_at
            and self.ends_at <= self.starts_at
        ):
            raise ValidationError({
                "ends_at": (
                    "زمان پایان نمایش باید بعد از زمان شروع باشد."
                )
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.title or f"Banner #{self.pk}"


class HomepageSettings(models.Model):
    site_name = models.CharField(
        "نام سایت",
        max_length=100,
        default="Kerman Cars",
    )
    hero_title = models.CharField(
        "عنوان اصلی",
        max_length=200,
        blank=True,
        default="",
    )
    hero_subtitle = models.CharField(
        "زیرعنوان اصلی",
        max_length=300,
        blank=True,
        default="",
    )
    featured_section_title = models.CharField(
        "عنوان بخش آگهی‌های ویژه",
        max_length=150,
        default="آگهی‌های ویژه",
    )
    latest_section_title = models.CharField(
        "عنوان بخش جدیدترین آگهی‌ها",
        max_length=150,
        default="جدیدترین آگهی‌ها",
    )
    contact_phone = models.CharField(
        "شماره تماس",
        max_length=20,
        blank=True,
        default="",
    )
    whatsapp_number = models.CharField(
        "شماره واتساپ",
        max_length=20,
        blank=True,
        default="",
    )
    contact_email = models.EmailField("ایمیل پشتیبانی", blank=True, default="")
    contact_address = models.TextField("نشانی پشتیبانی", blank=True, default="")
    about_content = models.TextField("متن درباره ما", blank=True, default="")
    terms_content = models.TextField("متن قوانین استفاده", blank=True, default="")
    privacy_content = models.TextField("متن حریم خصوصی", blank=True, default="")
    seo_title = models.CharField(
        "عنوان سئو",
        max_length=200,
        blank=True,
        default="",
    )
    seo_description = models.CharField(
        "توضیحات سئو",
        max_length=300,
        blank=True,
        default="",
    )
    show_featured_listings = models.BooleanField(
        "نمایش آگهی‌های ویژه",
        default=True,
    )
    show_latest_listings = models.BooleanField(
        "نمایش جدیدترین آگهی‌ها",
        default=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "تنظیمات صفحه اصلی"
        verbose_name_plural = "تنظیمات صفحه اصلی"

    def save(self, *args, **kwargs):
        # این جدول همیشه فقط یک رکورد با شناسه ۱ دارد.
        self.pk = 1
        return super().save(*args, **kwargs)

    def __str__(self):
        return "Homepage settings"

class MagazineArticleQuerySet(models.QuerySet):
    def publicly_visible(self):
        from django.db.models import Q
        return self.filter(is_active=True).filter(Q(published_at__isnull=True) | Q(published_at__lte=timezone.now()))


class MagazineArticle(models.Model):
    title = models.CharField("عنوان", max_length=180)
    slug = models.SlugField(max_length=220, unique=True, blank=True, allow_unicode=True)
    excerpt = models.CharField("خلاصه", max_length=350)
    content = models.TextField("متن مطلب", max_length=30000)
    cover_image = models.ImageField("تصویر", upload_to="homepage/magazine/", blank=True, null=True)
    cover_alt = models.CharField("توضیح تصویر", max_length=180, blank=True, default="")
    is_active = models.BooleanField("انتشار", default=False, db_index=True)
    published_at = models.DateTimeField("زمان انتشار", blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = MagazineArticleQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at", "-id"]

    @property
    def publication_date(self):
        return self.published_at or self.created_at

    def save(self, *args, **kwargs):
        if not self.slug:
            from uuid import uuid4
            from django.utils.text import slugify
            self.slug = f"{slugify(self.title, allow_unicode=True)[:180] or 'article'}-{uuid4().hex[:12]}"
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class HomepageFAQ(models.Model):
    question = models.CharField("پرسش", max_length=180)
    answer = models.TextField("پاسخ", max_length=3000)
    sort_order = models.PositiveIntegerField("ترتیب", default=0)
    is_active = models.BooleanField("نمایش", default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.question
