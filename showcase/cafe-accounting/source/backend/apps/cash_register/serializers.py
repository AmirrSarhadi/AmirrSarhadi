from rest_framework import serializers

from .models import CashShift


class OpenCashShiftSerializer(serializers.Serializer):
    opening_cash = serializers.IntegerField(min_value=0, max_value=10**15)


class CloseCashShiftSerializer(serializers.Serializer):
    closing_cash = serializers.IntegerField(min_value=0, max_value=10**15)


class CashShiftHistoryQuerySerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, attrs):
        if attrs["start_date"] > attrs["end_date"]:
            raise serializers.ValidationError("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.")
        if (attrs["end_date"] - attrs["start_date"]).days >= 366:
            raise serializers.ValidationError("بازه گزارش نمی‌تواند بیشتر از ۳۶۶ روز باشد.")
        return attrs


class CashShiftSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.CharField(source="opened_by.email", read_only=True)
    closed_by_name = serializers.CharField(source="closed_by.email", read_only=True)

    class Meta:
        model = CashShift
        fields = (
            "id",
            "status",
            "opening_cash",
            "closing_cash",
            "cash_sales",
            "expected_cash",
            "variance",
            "opened_by_name",
            "closed_by_name",
            "opened_at",
            "closed_at",
        )
