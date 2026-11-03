from django.conf import settings
from django.db import models
from listings.models import Listing


class ListingReport(models.Model):
    class Reason(models.TextChoices):
        FRAUD = "fraud", "کلاهبرداری"
        WRONG_INFO = "wrong_info", "اطلاعات نادرست"
        UNREAL_PRICE = "unreal_price", "قیمت غیرواقعی"
        DUPLICATE = "duplicate", "آگهی تکراری"
        INAPPROPRIATE = "inappropriate", "محتوای نامناسب"
        OTHER = "other", "سایر"

    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار بررسی"
        RESOLVED = "resolved", "تایید شد"
        REJECTED = "rejected", "رد گزارش"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listing_reports",
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    reason = models.CharField(max_length=30, choices=Reason.choices)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_listing_reports",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["reporter", "listing"],
                name="unique_reporter_listing_report",
            )
        ]

    def __str__(self):
        return f"Report #{self.id} - listing {self.listing_id}"


class ModerationAction(models.Model):
    class ActionType(models.TextChoices):
        REQUEST_EDITS = "request_edits", "درخواست اصلاح آگهی"
        APPROVE_LISTING = "approve_listing", "تایید آگهی"
        REJECT_LISTING = "reject_listing", "رد آگهی"
        RESOLVE_REPORT = "resolve_report", "تایید گزارش"
        REJECT_REPORT = "reject_report", "رد گزارش"

    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="moderation_actions",
    )
    report = models.ForeignKey(
        ListingReport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="actions",
    )
    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderation_actions_done",
    )
    action = models.CharField(max_length=30, choices=ActionType.choices)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.action} - listing {self.listing_id}"
