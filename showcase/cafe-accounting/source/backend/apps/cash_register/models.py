import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.organizations.models import Branch


class CashShift(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "باز"
        CLOSED = "closed", "بسته"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="cash_shifts")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    opening_cash = models.PositiveBigIntegerField(default=0)
    closing_cash = models.PositiveBigIntegerField(null=True, blank=True)
    cash_sales = models.PositiveBigIntegerField(null=True, blank=True)
    expected_cash = models.PositiveBigIntegerField(null=True, blank=True)
    variance = models.BigIntegerField(null=True, blank=True)
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="opened_cash_shifts"
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="closed_cash_shifts",
        null=True,
        blank=True,
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-opened_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("branch",),
                condition=Q(status="open"),
                name="unique_open_cash_shift_per_branch",
            )
        ]

    def __str__(self):
        return f"{self.branch} - {self.get_status_display()}"
