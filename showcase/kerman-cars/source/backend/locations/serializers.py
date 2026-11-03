from rest_framework import serializers
from .models import Province, City, Neighborhood


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ("id", "name")


class CitySerializer(serializers.ModelSerializer):
    province_name = serializers.CharField(source="province.name", read_only=True)

    class Meta:
        model = City
        fields = ("id", "name", "province", "province_name")

class NeighborhoodSerializer(
    serializers.ModelSerializer
):
    city_name = serializers.CharField(
        source="city.name",
        read_only=True,
    )

    class Meta:
        model = Neighborhood
        fields = (
            "id",
            "name",
            "city",
            "city_name",
        )