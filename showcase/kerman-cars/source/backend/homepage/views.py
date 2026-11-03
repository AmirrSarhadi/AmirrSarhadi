from django.utils import timezone

from rest_framework import permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Banner, HomepageSettings, MagazineArticle, HomepageFAQ
from .serializers import (
    HomepageQuerySerializer,
    PublicArticleSerializer,
    PublicArticleDetailSerializer,
    PublicFAQSerializer,
    HomepageResponseSerializer,
    PublicBannerSerializer,
    PublicHomepageSettingsSerializer,
)
from drf_spectacular.utils import extend_schema

class HomepageAPIView(APIView):
    permission_classes = [
        permissions.AllowAny,
    ]
    
    @extend_schema(
        tags=["homepage"],
        parameters=[
            HomepageQuerySerializer,
    PublicArticleSerializer,
    PublicArticleDetailSerializer,
    PublicFAQSerializer,
        ],
        responses={
            200: HomepageResponseSerializer,
        },
    )

    def get(self, request):
        query_serializer = HomepageQuerySerializer(
            data=request.query_params.dict(),
        )
        query_serializer.is_valid(
            raise_exception=True,
        )

        position = (
            query_serializer.validated_data
            .get("position")
        )

        banners = Banner.objects.currently_visible(
            at=timezone.now(),
        )

        if position:
            banners = banners.filter(
                position=position,
            )

        banners = banners.order_by(
            "position",
            "sort_order",
            "-created_at",
        )

        settings_object = (
            HomepageSettings.objects
            .filter(pk=1)
            .first()
        )

        if settings_object is None:
            # شیء پیش‌فرض بدون نوشتن در دیتابیس
            settings_object = HomepageSettings()

        return Response(
            {
                "faqs": PublicFAQSerializer(HomepageFAQ.objects.filter(is_active=True), many=True).data,
                "articles": PublicArticleSerializer(public_article_queryset()[:3], many=True, context={"request": request}).data,
                "settings": (
                    PublicHomepageSettingsSerializer(
                        settings_object,
                        context={"request": request},
                    ).data
                ),
                "banners": PublicBannerSerializer(
                    banners,
                    many=True,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

def public_article_queryset():
    from django.db.models.functions import Coalesce
    return MagazineArticle.objects.publicly_visible().annotate(public_date=Coalesce("published_at", "created_at")).order_by("-public_date", "-id")


class PublicArticleListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicArticleSerializer

    def get_queryset(self):
        return public_article_queryset()


class PublicArticleDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicArticleDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return public_article_queryset()
