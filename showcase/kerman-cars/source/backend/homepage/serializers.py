from rest_framework import serializers

from .models import Banner, HomepageSettings, MagazineArticle, HomepageFAQ


class HomepageQuerySerializer(serializers.Serializer):
    position = serializers.ChoiceField(
        required=False,
        choices=Banner.Position.choices,
    )


class PublicBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = (
            "id",
            "title",
            "subtitle",
            "image",
            "mobile_image",
            "alt_text",
            "link_url",
            "open_in_new_tab",
            "position",
            "sort_order",
        )
        read_only_fields = fields


class PublicHomepageSettingsSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = HomepageSettings
        fields = (
            "site_name",
            "hero_title",
            "hero_subtitle",
            "featured_section_title",
            "latest_section_title",
            "contact_phone",
            "whatsapp_number",
            "contact_email",
            "contact_address",
            "about_content",
            "terms_content",
            "privacy_content",
            "seo_title",
            "seo_description",
            "show_featured_listings",
            "show_latest_listings",
        )
        read_only_fields = fields


class PublicArticleSerializer(serializers.ModelSerializer):
    published_at = serializers.DateTimeField(source="publication_date", read_only=True)

    class Meta:
        model = MagazineArticle
        fields = ("id", "title", "slug", "excerpt", "cover_image", "cover_alt", "published_at")
        read_only_fields = fields


class PublicArticleDetailSerializer(PublicArticleSerializer):
    class Meta(PublicArticleSerializer.Meta):
        fields = PublicArticleSerializer.Meta.fields + ("content",)
        read_only_fields = fields


class PublicFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageFAQ
        fields = ("id", "question", "answer")
        read_only_fields = fields

class HomepageResponseSerializer(
    serializers.Serializer
):
    settings = PublicHomepageSettingsSerializer(
        read_only=True,
    )
    banners = PublicBannerSerializer(
        many=True,
        read_only=True,
    )
    faqs = PublicFAQSerializer(many=True, read_only=True)
    articles = PublicArticleSerializer(many=True, read_only=True)