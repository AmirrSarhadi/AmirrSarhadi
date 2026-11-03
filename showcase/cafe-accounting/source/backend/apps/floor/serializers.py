from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import DiningTable


class DiningTableSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiningTable
        fields = ("id", "label", "capacity", "sort_order", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_label(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("نام یا شماره میز نمی‌تواند خالی باشد.")
        return value

    def create(self, validated_data):
        validated_data["branch_id"] = self.context["branch_id"]
        return self._save_with_unique_error(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._save_with_unique_error(super().update, instance, validated_data)

    def _save_with_unique_error(self, save, *args):
        try:
            with transaction.atomic():
                return save(*args)
        except IntegrityError as error:
            raise serializers.ValidationError(
                {"label": "یک میز فعال با این نام یا شماره در شعبه وجود دارد."}
            ) from error
