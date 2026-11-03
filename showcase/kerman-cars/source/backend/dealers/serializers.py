from rest_framework import serializers

from accounts.models import DealerProfile
from listings.serializers import ListingListSerializer

class PublicDealerListSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(
        source="city.name",
        read_only=True,
        allow_null=True,
    )

    neighborhood_name = serializers.CharField(
        source="neighborhood.name",
        read_only=True,
        allow_null=True,
    )

    listings_count = serializers.IntegerField(
        read_only=True,
    )

    class Meta:
        model = DealerProfile

        fields = (
            "id",
            "business_name",
            "slug",
            "logo",
            "cover_image",
            "city",
            "city_name",
            "neighborhood",
            "neighborhood_name",
            "phone",
            "landline",
            "whatsapp_number",
            "website",
            "instagram",
            "verified_at",
            "listings_count",
        )


class PublicDealerDetailSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(
        source="city.name",
        read_only=True,
    )

    neighborhood_name = serializers.CharField(
        source="neighborhood.name",
        read_only=True,
    )

    class Meta:
        model = DealerProfile

        fields = (
            "id",
            "business_name",
            "slug",
            "logo",
            "cover_image",
            "phone",
            "landline",
            "whatsapp_number",
            "website",
            "instagram",
            "address",
            "description",
            "license_no",
            "manager_name",
            "business_hours",
            "city",
            "city_name",
            "neighborhood",
            "neighborhood_name",            
            "latitude",
            "longitude",
            "verified_at",
            "created_at",
            "updated_at",
        )


class PublicDealerListingSerializer(ListingListSerializer):
    class Meta(ListingListSerializer.Meta):
        fields = (*ListingListSerializer.Meta.fields, "created_at", "expires_at")
