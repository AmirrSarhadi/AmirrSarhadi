from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.email", read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id",
            "category",
            "category_label",
            "amount",
            "description",
            "expense_date",
            "recorded_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "category_label", "recorded_by_name", "created_at", "updated_at")

    def create(self, validated_data):
        return Expense.objects.create(
            branch=self.context["branch"],
            recorded_by=self.context["request"].user,
            **validated_data,
        )


class ExpenseReportQuerySerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, attrs):
        if attrs["start_date"] > attrs["end_date"]:
            raise serializers.ValidationError("تاریخ شروع نباید بعد از تاریخ پایان باشد.")
        if attrs["end_date"] - attrs["start_date"] > timedelta(days=366):
            raise serializers.ValidationError("بازه گزارش نمی‌تواند بیشتر از ۳۶۶ روز باشد.")
        if attrs["end_date"] > timezone.localdate() + timedelta(days=1):
            raise serializers.ValidationError("تاریخ پایان معتبر نیست.")
        return attrs
