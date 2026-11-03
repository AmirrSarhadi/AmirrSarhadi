import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.organizations.models import Branch


class Expense(models.Model):
    class Category(models.TextChoices):
        SUPPLIES = "supplies", "مواد اولیه"
        SALARY = "salary", "حقوق و دستمزد"
        RENT = "rent", "اجاره"
        UTILITIES = "utilities", "آب، برق و گاز"
        MAINTENANCE = "maintenance", "تعمیر و نگهداری"
        OTHER = "other", "سایر"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="expenses")
    category = models.CharField(max_length=20, choices=Category.choices)
    amount = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    description = models.CharField(max_length=250)
    expense_date = models.DateField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_expenses"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-expense_date", "-created_at")
        indexes = [models.Index(fields=("branch", "expense_date"), name="expense_branch_date_idx")]

    def __str__(self):
        return f"{self.get_category_display()} - {self.amount}"
