from decimal import Decimal

from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import Ingredient, RecipeComponent, StockBalance, StockMovement
from .units import UNITS


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ("id", "name", "base_unit", "reorder_level", "created_at")
        read_only_fields = ("id", "created_at")
        validators = []

    def validate_base_unit(self, value):
        if self.instance is not None and value != self.instance.base_unit:
            raise serializers.ValidationError("واحد پایه پس از تعریف ماده اولیه قابل تغییر نیست.")
        return value

    def _save(self, save, *args):
        try:
            with transaction.atomic():
                return save(*args)
        except IntegrityError as error:
            raise serializers.ValidationError(
                {"name": "این ماده اولیه قبلاً تعریف شده است."}
            ) from error

    def create(self, validated_data):
        validated_data["cafe"] = self.context["cafe"]
        return self._save(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._save(super().update, instance, validated_data)


class ComponentInputSerializer(serializers.Serializer):
    ingredient = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.none())
    quantity = serializers.DecimalField(max_digits=18, decimal_places=3, min_value=Decimal("0.001"))
    unit = serializers.ChoiceField(choices=tuple(UNITS))

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if cafe := self.context.get("cafe"):
            self.fields["ingredient"].queryset = Ingredient.objects.filter(cafe=cafe)


class RecipeInputSerializer(serializers.Serializer):
    components = ComponentInputSerializer(many=True, allow_empty=False, max_length=100)
    expected_updated_at = serializers.DateTimeField(required=False, allow_null=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["components"].child.fields["ingredient"].queryset = Ingredient.objects.filter(
            cafe=self.context["cafe"]
        )


class RecipeComponentSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name")
    unit = serializers.CharField(source="ingredient.base_unit")

    class Meta:
        model = RecipeComponent
        fields = ("ingredient", "ingredient_name", "quantity", "unit")


class StockBalanceSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name")
    unit = serializers.CharField(source="ingredient.base_unit")
    average_unit_cost = serializers.DecimalField(max_digits=30, decimal_places=6, read_only=True)
    reorder_level = serializers.DecimalField(
        source="ingredient.reorder_level", max_digits=18, decimal_places=3, read_only=True
    )
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = StockBalance
        fields = (
            "id",
            "ingredient",
            "ingredient_name",
            "unit",
            "quantity",
            "value",
            "average_unit_cost",
            "reorder_level",
            "is_low_stock",
        )

    def get_is_low_stock(self, stock):
        return stock.quantity <= stock.ingredient.reorder_level


class MovementInputSerializer(ComponentInputSerializer):
    kind = serializers.ChoiceField(
        choices=(
            StockMovement.Kind.RECEIPT,
            StockMovement.Kind.WASTE,
            StockMovement.Kind.ADJUSTMENT_IN,
            StockMovement.Kind.ADJUSTMENT_OUT,
        )
    )
    total_cost = serializers.DecimalField(
        max_digits=24,
        decimal_places=6,
        min_value=Decimal("0.000001"),
        required=False,
    )
    request_id = serializers.UUIDField()
    reason = serializers.CharField(min_length=3, max_length=250)

    def validate(self, attrs):
        inward = attrs["kind"] in (StockMovement.Kind.RECEIPT, StockMovement.Kind.ADJUSTMENT_IN)
        if inward and "total_cost" not in attrs:
            raise serializers.ValidationError({"total_cost": "ارزش کل مواد ورودی الزامی است."})
        if not inward and "total_cost" in attrs:
            raise serializers.ValidationError({"total_cost": "هزینه خروج توسط سیستم محاسبه می‌شود."})
        attrs.setdefault("total_cost", None)
        return attrs


class StockMovementSerializer(serializers.ModelSerializer):
    ingredient = serializers.UUIDField(source="stock.ingredient_id")
    ingredient_name = serializers.CharField(source="stock.ingredient.name")
    unit = serializers.CharField(source="stock.ingredient.base_unit")
    recorded_by_name = serializers.CharField(source="recorded_by.email")

    class Meta:
        model = StockMovement
        fields = (
            "id",
            "request_id",
            "ingredient",
            "ingredient_name",
            "unit",
            "kind",
            "quantity_delta",
            "value_delta",
            "quantity_after",
            "value_after",
            "order_item",
            "reason",
            "recorded_by_name",
            "created_at",
        )


class CostReportQuerySerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, attrs):
        days = (attrs["end_date"] - attrs["start_date"]).days
        if days < 0 or days >= 366:
            raise serializers.ValidationError("بازه گزارش باید بین یک تا ۳۶۶ روز باشد.")
        return attrs
