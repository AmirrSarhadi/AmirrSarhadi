from rest_framework import serializers

from cars.models import (
    BodyTypeChoices,
    FuelTypeChoices,
    TransmissionChoices,
)
from listings.models import Listing


class ListingFilterSerializer(serializers.Serializer):
    brand = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    car_model = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    trim = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    city = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    neighborhood = serializers.IntegerField(
        required=False,
        min_value=1,
    )

    body_type = serializers.ChoiceField(
        choices=BodyTypeChoices.choices,
        required=False,
    )
    fuel_type = serializers.ChoiceField(
        choices=FuelTypeChoices.choices,
        required=False,
    )
    transmission = serializers.ChoiceField(
        choices=TransmissionChoices.choices,
        required=False,
    )

    min_price = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    max_price = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    min_year = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    max_year = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    min_mileage = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    max_mileage = serializers.IntegerField(
        required=False,
        min_value=0,
    )

    color = serializers.CharField(
        required=False,
        max_length=50,
        allow_blank=False,
        trim_whitespace=True,
    )
    body_status = serializers.ChoiceField(
        choices=Listing.BodyStatus.choices,
        required=False,
    )
    price_type = serializers.ChoiceField(
        choices=Listing.PriceType.choices,
        required=False,
    )

    seller_type = serializers.ChoiceField(
        choices=(
            ("personal", "کاربر شخصی"),
            ("dealer", "بنگاه"),
        ),
        required=False,
    )

    is_installment = serializers.BooleanField(
        required=False,
    )
    is_exchangeable = serializers.BooleanField(
        required=False,
    )
    is_featured = serializers.BooleanField(
        required=False,
    )

    search = serializers.CharField(
        required=False,
        max_length=200,
        allow_blank=False,
        trim_whitespace=True,
    )

    ordering = serializers.ChoiceField(
        choices=(
            ("newest", "جدیدترین"),
            ("oldest", "قدیمی‌ترین"),
            ("price_asc", "ارزان‌ترین"),
            ("price_desc", "گران‌ترین"),
            ("mileage_asc", "کم‌کارکردترین"),
            ("year_desc", "جدیدترین سال ساخت"),
            ("most_viewed", "پربازدیدترین"),
        ),
        required=False,
    )

    def validate(self, attrs):
        errors = {}

        ranges = (
            ("min_price", "max_price"),
            ("min_year", "max_year"),
            ("min_mileage", "max_mileage"),
        )

        for min_field, max_field in ranges:
            min_value = attrs.get(min_field)
            max_value = attrs.get(max_field)

            if (
                min_value is not None
                and max_value is not None
                and min_value > max_value
            ):
                errors[max_field] = (
                    f"{max_field} نمی‌تواند کمتر از "
                    f"{min_field} باشد."
                )

        if errors:
            raise serializers.ValidationError(errors)

        return attrs