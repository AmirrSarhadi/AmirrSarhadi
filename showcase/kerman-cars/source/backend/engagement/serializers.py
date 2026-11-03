from rest_framework import serializers

from engagement.models import (
    Favorite,
    ListingInteraction,
)
from listings.models import Listing
from listings.serializers import ListingListSerializer


class FavoriteCreateSerializer(serializers.Serializer):
    listing_id = serializers.IntegerField(min_value=1)

    def validate_listing_id(self, value):
        try:
            listing = Listing.objects.get(id=value)
        except Listing.DoesNotExist:
            raise serializers.ValidationError("آگهی موردنظر پیدا نشد.")

        # فقط آگهی منتشرشده قابل علاقه‌مندی باشد
        if listing.status != Listing.Status.PUBLISHED:
            raise serializers.ValidationError("فقط آگهی منتشرشده قابل افزودن به علاقه‌مندی است.")

        self.context["listing_obj"] = listing
        return value


class FavoriteListItemSerializer(serializers.ModelSerializer):
    listing = ListingListSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ("id", "created_at", "listing")


class ListingInteractionCreateSerializer(
    serializers.Serializer
):
    listing_id = serializers.IntegerField(
        min_value=1,
    )

    event_type = serializers.ChoiceField(
        choices=(
            ListingInteraction.EventType.PHONE_REVEAL,
            ListingInteraction.EventType.CALL_CLICK,
            ListingInteraction.EventType.WHATSAPP_CLICK,
            ListingInteraction.EventType.SHARE,
        ),
    )

    def validate_listing_id(self, value):
        listing = (
            Listing.objects
            .publicly_visible()
            .filter(pk=value)
            .first()
        )

        if listing is None:
            raise serializers.ValidationError(
                "آگهی منتشرشده‌ای با این شناسه پیدا نشد."
            )

        self.context["listing_obj"] = listing
        return value


class ViewHistoryItemSerializer(
    serializers.Serializer
):
    listing = ListingListSerializer(
        read_only=True,
    )

    last_viewed_at = serializers.DateTimeField(
        read_only=True,
    )

    view_count = serializers.IntegerField(
        read_only=True,
    )

class FavoriteToggleResponseSerializer(
    serializers.Serializer
):
    detail = serializers.CharField(
        read_only=True,
    )
    is_favorited = serializers.BooleanField(
        read_only=True,
    )


class ListingInteractionResponseSerializer(
    serializers.Serializer
):
    recorded = serializers.BooleanField(
        read_only=True,
    )
    event_type = serializers.ChoiceField(
        read_only=True,
        choices=(
            ListingInteraction.EventType.PHONE_REVEAL,
            ListingInteraction.EventType.CALL_CLICK,
            ListingInteraction.EventType.WHATSAPP_CLICK,
            ListingInteraction.EventType.SHARE,
        ),
    )


class DealerAnalyticsQuerySerializer(
    serializers.Serializer
):
    days = serializers.ChoiceField(
        required=False,
        default=30,
        choices=(7, 30, 90),
    )


class DealerAnalyticsPeriodSerializer(
    serializers.Serializer
):
    days = serializers.IntegerField(
        read_only=True,
    )
    start_date = serializers.DateField(
        read_only=True,
    )
    end_date = serializers.DateField(
        read_only=True,
    )


class DealerAnalyticsSummarySerializer(
    serializers.Serializer
):
    total_views = serializers.IntegerField(
        read_only=True,
    )
    unique_views = serializers.IntegerField(
        read_only=True,
    )
    phone_reveals = serializers.IntegerField(
        read_only=True,
    )
    call_clicks = serializers.IntegerField(
        read_only=True,
    )
    whatsapp_clicks = serializers.IntegerField(
        read_only=True,
    )
    shares = serializers.IntegerField(
        read_only=True,
    )
    favorite_events = serializers.IntegerField(
        read_only=True,
    )
    current_favorites = serializers.IntegerField(
        read_only=True,
    )
    conversion_rate = serializers.FloatField(
        read_only=True,
    )


class DealerAnalyticsTrendSerializer(
    serializers.Serializer
):
    date = serializers.DateField(
        read_only=True,
    )
    views = serializers.IntegerField(
        read_only=True,
    )
    unique_views = serializers.IntegerField(
        read_only=True,
    )


class DealerAnalyticsTopListingSerializer(
    serializers.Serializer
):
    id = serializers.IntegerField(
        read_only=True,
    )
    slug = serializers.SlugField(
        read_only=True,
    )
    title = serializers.CharField(
        read_only=True,
    )
    analytics_views = serializers.IntegerField(
        read_only=True,
    )
    analytics_calls = serializers.IntegerField(
        read_only=True,
    )


class DealerAnalyticsResponseSerializer(
    serializers.Serializer
):
    period = DealerAnalyticsPeriodSerializer(
        read_only=True,
    )
    summary = DealerAnalyticsSummarySerializer(
        read_only=True,
    )
    trend = DealerAnalyticsTrendSerializer(
        many=True,
        read_only=True,
    )
    top_listings = DealerAnalyticsTopListingSerializer(
        many=True,
        read_only=True,
    )


class ViewHistoryQuerySerializer(
    serializers.Serializer
):
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )