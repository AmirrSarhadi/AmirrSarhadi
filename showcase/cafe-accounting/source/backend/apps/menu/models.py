import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from apps.organizations.models import Cafe

from .images import menu_image_path


class MenuCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cafe = models.ForeignKey(Cafe, on_delete=models.CASCADE, related_name="menu_categories")
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=250, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "name")
        constraints = [
            models.UniqueConstraint(
                fields=("cafe", "name"),
                condition=Q(is_active=True),
                name="unique_active_menu_category_name_per_cafe",
            )
        ]
        indexes = [
            models.Index(
                fields=("cafe", "is_active", "sort_order"),
                name="menu_cat_cafe_active_ord_idx",
            )
        ]

    def __str__(self):
        return f"{self.cafe} - {self.name}"


class MenuItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(MenuCategory, on_delete=models.PROTECT, related_name="items")
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=500, blank=True)
    image = models.ImageField(upload_to=menu_image_path, blank=True, null=True)
    price = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    sort_order = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "name")
        constraints = [
            models.UniqueConstraint(
                fields=("category", "name"),
                condition=Q(is_active=True),
                name="unique_active_menu_item_name_per_category",
            )
        ]
        indexes = [
            models.Index(
                fields=("category", "is_active", "sort_order"),
                name="menu_item_cat_active_ord_idx",
            )
        ]

    def __str__(self):
        return f"{self.category} - {self.name}"
