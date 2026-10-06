from decimal import Decimal

from rest_framework import serializers

from .models import Transfer
from .services import TransferCommand, create_transfer


class TransferCreateSerializer(serializers.Serializer):
    source_id = serializers.IntegerField(min_value=1)
    destination_id = serializers.IntegerField(min_value=1)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    reference = serializers.CharField(max_length=80, allow_blank=True, required=False)

    def validate(self, attrs):
        if attrs["source_id"] == attrs["destination_id"]:
            raise serializers.ValidationError(
                {"destination_id": "Destination must be different from source."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        command = TransferCommand(
            source_id=validated_data["source_id"],
            destination_id=validated_data["destination_id"],
            amount=validated_data["amount"],
            reference=validated_data.get("reference", ""),
        )
        return create_transfer(command=command, user=request.user)


class TransferReadSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)
    destination_name = serializers.CharField(source="destination.name", read_only=True)

    class Meta:
        model = Transfer
        fields = (
            "id",
            "source_id",
            "source_name",
            "destination_id",
            "destination_name",
            "amount",
            "reference",
            "status",
            "created_at",
        )
