from rest_framework import serializers

from .models import Brand, CarModel, CarTrim


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "logo")


class CarModelSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    body_type_display = serializers.CharField(source="get_body_type_display", read_only=True)

    class Meta:
        model = CarModel
        fields = (
            "id",
            "name",
            "brand",
            "brand_name",
            "body_type",
            "body_type_display",
        )


class CarTrimSerializer(serializers.ModelSerializer):
    car_model_name = serializers.CharField(source="car_model.name", read_only=True)
    brand_name = serializers.CharField(source="car_model.brand.name", read_only=True)
    fuel_type_display = serializers.CharField(source="get_fuel_type_display", read_only=True)
    transmission_display = serializers.CharField(source="get_transmission_display", read_only=True)

    class Meta:
        model = CarTrim
        fields = (
            "id",
            "name",
            "car_model",
            "car_model_name",
            "brand_name",
            "engine_volume",
            "fuel_type",
            "fuel_type_display",
            "transmission",
            "transmission_display",
        )
