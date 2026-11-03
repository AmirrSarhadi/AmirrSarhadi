# KermanCars/backend/engagement/models.py

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from listings.models import Listing


class Favorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "listing"],
                name="unique_favorite_user_listing",
            )
        ]
        ordering = ["-created_at"]


class ListingVisit(models.Model):
    # Daily unique view
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listing_visits",
        null=True,
        blank=True,
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="visits",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )
    visit_date = models.DateField(default=timezone.localdate, db_index=True)
    last_visited_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "listing", "visit_date"],
                condition=Q(user__isnull=False),
                name="unique_daily_visit_user_listing",
            ),
            models.UniqueConstraint(
                fields=["ip_address", "listing", "visit_date"],
                condition=Q(user__isnull=True, ip_address__isnull=False),
                name="unique_daily_visit_ip_listing",
            ),
            models.CheckConstraint(
                condition=(
                    Q(user__isnull=False) |
                    Q(ip_address__isnull=False)
                ),
                name="listing_visit_user_or_ip_required",
            ),
        ]
        indexes = [
            models.Index(fields=["listing", "visit_date"]),
            models.Index(fields=["user", "visit_date"]),
            models.Index(fields=["ip_address", "visit_date"]),
        ]
        ordering = ["-visit_date", "-last_visited_at"]
        verbose_name = "بازدید یکتای روزانه آگهی"
        verbose_name_plural = "بازدیدهای یکتای روزانه آگهی"

    def __str__(self):
        who = self.user_id or self.ip_address
        return f"{self.listing_id} - {who} - {self.visit_date}"


class RawListingView(models.Model):
    # Every hit
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="raw_listing_views",
        null=True,
        blank=True,
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="raw_views",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["listing", "viewed_at"]),
            models.Index(fields=["user", "viewed_at"]),
            models.Index(fields=["ip_address", "viewed_at"]),
        ]
        ordering = ["-viewed_at"]
        verbose_name = "بازدید خام آگهی"
        verbose_name_plural = "بازدیدهای خام آگهی"

    def __str__(self):
        who = self.user_id or self.ip_address or "anonymous"
        return f"{self.listing_id} - {who} - {self.viewed_at}"


class ListingInteraction(models.Model):
    class EventType(models.TextChoices):
        VIEW = "view", "بازدید"
        PHONE_REVEAL = "phone_reveal", "نمایش شماره"
        CALL_CLICK = "call_click", "کلیک تماس"
        WHATSAPP_CLICK = "whatsapp_click", "کلیک واتساپ"
        SHARE = "share", "اشتراک‌گذاری"
        FAVORITE = "favorite", "افزودن به علاقه‌مندی"

    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="interactions",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="listing_interactions",
        null=True,
        blank=True,
    )

    session_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )

    event_type = models.CharField(
        max_length=30,
        choices=EventType.choices,
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
                    "listing",
                    "event_type",
                    "created_at",
                ],
            ),
            models.Index(
                fields=[
                    "user",
                    "event_type",
                    "created_at",
                ],
            ),
            models.Index(
                fields=[
                    "session_id",
                    "event_type",
                    "created_at",
                ],
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(user__isnull=False)
                    | ~Q(session_id="")
                ),
                name="interaction_user_or_session_required",
            ),
        ]

    def __str__(self):
        return (
            f"{self.listing_id} - "
            f"{self.event_type} - "
            f"{self.created_at}"
        )

class SavedSearch(models.Model):
    alerts_enabled = models.BooleanField(default=False)
    alerts_since = models.DateTimeField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_searches')
    filters = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']
