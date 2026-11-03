from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import serializers

from .images import normalize_image
from .models import MenuCategory, MenuItem


class CleanTextMixin:
    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("نام نمی‌تواند خالی باشد.")
        return value


class MenuCategorySerializer(CleanTextMixin, serializers.ModelSerializer):
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = MenuCategory
        fields = (
            "id",
            "name",
            "description",
            "sort_order",
            "item_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["cafe_id"] = self.context["cafe_id"]
        return self._save_with_unique_error(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._save_with_unique_error(super().update, instance, validated_data)

    def _save_with_unique_error(self, save, *args):
        try:
            with transaction.atomic():
                return save(*args)
        except IntegrityError as error:
            raise serializers.ValidationError(
                {"name": "یک دسته‌بندی فعال با این نام وجود دارد."}
            ) from error


class MenuItemSerializer(CleanTextMixin, serializers.ModelSerializer):
    is_available = serializers.BooleanField(required=False, default=True)
    image = serializers.ImageField(write_only=True, required=False, allow_null=True)
    image_url = serializers.SerializerMethodField()

    def validate_image(self, value):
        return normalize_image(value) if value else None

    def get_image_url(self, item):
        if not item.image:
            return None
        return reverse("menu:item-image", kwargs={"cafe_id": item.category.cafe_id, "pk": item.pk})

    category_name = serializers.CharField(source="category.name", read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=MenuCategory.objects.none(),
        error_messages={"does_not_exist": "دسته‌بندی انتخاب‌شده معتبر نیست."},
    )

    class Meta:
        model = MenuItem
        fields = (
            "id",
            "category",
            "category_name",
            "image",
            "image_url",
            "name",
            "description",
            "price",
            "sort_order",
            "is_available",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "category_name", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        cafe_id = self.context.get("cafe_id")
        if cafe_id:
            self.fields["category"].queryset = MenuCategory.objects.filter(
                cafe_id=cafe_id,
                is_active=True,
            )

    def validate_category(self, category):
        if not category.is_active or str(category.cafe_id) != str(self.context["cafe_id"]):
            raise serializers.ValidationError("دسته‌بندی انتخاب‌شده معتبر نیست.")
        return category

    def create(self, validated_data):
        return self._save_with_unique_error(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._save_with_unique_error(super().update, instance, validated_data)

    def _save_with_unique_error(self, save, *args):
        try:
            with transaction.atomic():
                return save(*args)
        except IntegrityError as error:
            raise serializers.ValidationError(
                {"name": "یک آیتم فعال با این نام در دسته‌بندی وجود دارد."}
            ) from error
