from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    class Kind(models.TextChoices):
        SAVED_SEARCH_MATCH = "saved_search_match", "آگهی جدید مطابق جست‌وجو"
        REPORT_REVIEWED = "report_reviewed", "نتیجهٔ بررسی گزارش"
        DEALER_APPROVED = "dealer_approved", "تأیید نمایشگاه"
        DEALER_REJECTED = "dealer_rejected", "رد درخواست نمایشگاه"
        DEALER_SUSPENDED = "dealer_suspended", "تعلیق نمایشگاه"
        LISTING_APPROVED = (
            "listing_approved",
            "تأیید آگهی",
        )
        LISTING_REJECTED = (
            "listing_rejected",
            "رد آگهی",
        )
        LISTING_NEEDS_EDIT = (
            "listing_needs_edit",
            "نیاز به اصلاح آگهی",
        )
        LISTING_EXPIRING = (
            "listing_expiring",
            "نزدیک‌شدن انقضای آگهی",
        )
        SUBSCRIPTION_EXPIRING = (
            "subscription_expiring",
            "نزدیک‌شدن پایان اشتراک",
        )
        SUBSCRIPTION_EXPIRED = (
            "subscription_expired",
            "پایان اشتراک",
        )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    kind = models.CharField(
        max_length=40,
        choices=Kind.choices,
        db_index=True,
    )

    title = models.CharField(
        max_length=200,
    )

    message = models.TextField()

    data = models.JSONField(
        default=dict,
        blank=True,
    )

    # برای جلوگیری از ارسال چندباره اعلان‌های زمان‌بندی‌شده
    dedupe_key = models.CharField(
        max_length=200,
        unique=True,
        null=True,
        blank=True,
    )

    read_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=[
                    "user",
                    "read_at",
                    "created_at",
                ],
            ),
        ]

    @property
    def is_read(self):
        return self.read_at is not None

    def mark_as_read(self):
        if self.read_at is not None:
            return False

        self.read_at = timezone.now()
        self.save(
            update_fields=["read_at"],
        )
        return True

    def __str__(self):
        return f"{self.user_id} - {self.title}"