import uuid
from decimal import Decimal, localcontext

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Ingredient(models.Model):
    class Unit(models.TextChoices):
        GRAM = "g", "گرم"
        MILLILITRE = "ml", "میلی‌لیتر"
        PIECE = "piece", "عدد"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cafe = models.ForeignKey("organizations.Cafe", on_delete=models.PROTECT)
    name = models.CharField(max_length=120)
    base_unit = models.CharField(max_length=8, choices=Unit.choices)
    reorder_level = models.DecimalField(
        max_digits=18, decimal_places=3, default=0, validators=[MinValueValidator(0)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name", "id")
        constraints = [
            models.UniqueConstraint(fields=("cafe", "name"), name="ingredient_cafe_name_unique"),
            models.CheckConstraint(
                condition=Q(reorder_level__gte=0), name="ingredient_reorder_nonnegative"
            ),
        ]

    def __str__(self):
        return self.name


class Recipe(models.Model):
    menu_item = models.OneToOneField(
        "menu.MenuItem", primary_key=True, on_delete=models.PROTECT, related_name="recipe"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"دستور تهیه {self.menu_item}"


class RecipeComponent(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="components")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
    quantity = models.DecimalField(
        max_digits=18, decimal_places=3, validators=[MinValueValidator(Decimal("0.001"))]
    )

    class Meta:
        ordering = ("ingredient_id",)
        constraints = [
            models.UniqueConstraint(
                fields=("recipe", "ingredient"), name="recipe_ingredient_unique"
            ),
            models.CheckConstraint(condition=Q(quantity__gt=0), name="recipe_quantity_positive"),
        ]

    def __str__(self):
        return f"{self.ingredient} × {self.quantity}"


class StockBalance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=18, decimal_places=3, default=0)
    value = models.DecimalField(max_digits=24, decimal_places=6, default=0)

    class Meta:
        ordering = ("ingredient__name", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("branch", "ingredient"), name="stock_branch_ingredient_unique"
            ),
            models.CheckConstraint(condition=Q(quantity__gte=0), name="stock_qty_nonnegative"),
            models.CheckConstraint(condition=Q(value__gte=0), name="stock_value_nonnegative"),
            models.CheckConstraint(
                condition=Q(quantity__gt=0) | Q(value=0), name="empty_stock_has_zero_value"
            ),
        ]

    def __str__(self):
        return f"{self.branch} - {self.ingredient}"

    @property
    def average_unit_cost(self):
        with localcontext() as context:
            context.prec = 50
            return self.value / self.quantity if self.quantity else Decimal(0)


class StockMovement(models.Model):
    class Kind(models.TextChoices):
        RECEIPT = "receipt", "ورود خرید"
        WASTE = "waste", "ضایعات"
        ADJUSTMENT_IN = "adjustment_in", "اصلاح افزایشی"
        ADJUSTMENT_OUT = "adjustment_out", "اصلاح کاهشی"
        SALE = "sale", "مصرف فروش"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock = models.ForeignKey(StockBalance, on_delete=models.PROTECT, related_name="movements")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    request_id = models.UUIDField(null=True, blank=True, unique=True)
    quantity_delta = models.DecimalField(max_digits=18, decimal_places=3)
    value_delta = models.DecimalField(max_digits=24, decimal_places=6)
    quantity_after = models.DecimalField(max_digits=18, decimal_places=3)
    value_after = models.DecimalField(max_digits=24, decimal_places=6)
    order_item = models.ForeignKey(
        "orders.OrderItem",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    reason = models.CharField(max_length=250)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        constraints = [
            models.UniqueConstraint(
                fields=("stock", "order_item"),
                condition=Q(kind="sale"),
                name="stock_sale_order_item_unique",
            ),
            models.CheckConstraint(
                condition=(
                    Q(
                        kind__in=("receipt", "adjustment_in"),
                        quantity_delta__gt=0,
                        value_delta__gt=0,
                        order_item__isnull=True,
                        request_id__isnull=False,
                    )
                    | Q(
                        kind__in=("waste", "adjustment_out"),
                        quantity_delta__lt=0,
                        value_delta__lte=0,
                        order_item__isnull=True,
                        request_id__isnull=False,
                    )
                    | Q(
                        kind="sale",
                        quantity_delta__lt=0,
                        value_delta__lte=0,
                        order_item__isnull=False,
                        request_id__isnull=True,
                    )
                ),
                name="stock_movement_kind_consistent",
            ),
        ]
        indexes = [models.Index(fields=("stock", "created_at"), name="stock_movement_time_idx")]

    def __str__(self):
        return f"{self.stock} - {self.get_kind_display()} ({self.quantity_delta})"
