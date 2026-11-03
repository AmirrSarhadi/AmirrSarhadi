import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from apps.organizations.models import Branch


class DiningTable(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="dining_tables")
    label = models.CharField(max_length=50)
    capacity = models.PositiveSmallIntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "label")
        constraints = [
            models.UniqueConstraint(
                fields=("branch", "label"),
                condition=Q(is_active=True),
                name="unique_active_table_label_per_branch",
            )
        ]
        indexes = [
            models.Index(
                fields=("branch", "is_active", "sort_order"),
                name="table_branch_active_ord_idx",
            )
        ]

    def __str__(self):
        return f"{self.branch} - {self.label}"
