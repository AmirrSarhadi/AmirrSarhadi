import json

from copy import copy

from django.core.exceptions import ValidationError
from django.utils import timezone

from rest_framework import serializers
from accounts.models import DealerProfile, User
from .models import Listing, ListingImage
from cars.models import (
    Brand,
    CarModel,
    CarTrim,
    FuelTypeChoices,
    TransmissionChoices,
)
from .services.duplicate_detection import check_listing_duplicate
from .validators import validate_listing_image
from notifications.services import (
    notify_listing_status,
)
from drf_spectacular.utils import extend_schema_field
from django.conf import settings


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = (
            "id",
            "image",
            "is_cover",
            "order",
            "created_at",
        )
        read_only_fields = (
            "id",
            "created_at",
        )


class ListingListSerializer(serializers.ModelSerializer):
    cover_image = serializers.SerializerMethodField()

    brand_name = serializers.CharField(
        source="brand.name",
        read_only=True,
    )
    car_model_name = serializers.CharField(
        source="car_model.name",
        read_only=True,
    )
    city_name = serializers.CharField(
        source="city.name",
        read_only=True,
    )
    neighborhood_name = serializers.CharField(
        source="neighborhood.name",
        read_only=True,
        allow_null=True,
    )
    is_favorited = serializers.SerializerMethodField()

    trim_name = serializers.CharField(
        source="trim.name",
        read_only=True,
        allow_null=True,
    )

    body_type = serializers.CharField(
        source="car_model.body_type",
        read_only=True,
        allow_blank=True,
    )

    fuel_type = serializers.SerializerMethodField()
    transmission = serializers.SerializerMethodField()
    seller_type = serializers.SerializerMethodField()
    is_verified_dealer = serializers.SerializerMethodField()

    view_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    is_featured = serializers.SerializerMethodField()
    class Meta:
        model = Listing
        fields = (
            "id",
            "slug",
            "public_code",
            "title",

            # خودرو
            "brand",
            "brand_name",
            "car_model",
            "car_model_name",
            "trim",
            "trim_name",
            "body_type",
            "fuel_type",
            "transmission",
            "seller_type",
            "is_verified_dealer",
            "city",
            "city_name",
            "neighborhood",
            "neighborhood_name",
            "production_year",
            "mileage",
            "color",
            "interior_color",
            "usage_type",
            "engine_status",
            "transmission_status",
            "front_chassis_status",
            "rear_chassis_status",
            "owner_count",
            "document_status",
            "plate_type",
            "body_status",
            "body_note",

            # قیمت
            "price",
            "price_type",
            "is_exchangeable",
            "is_installment",
            "down_payment",
            "installment_amount",
            "installment_count",

            # وضعیت
            "status",
            "is_featured",
            "featured_at",
            "last_bumped_at",
            "featured_until",
            "featured_priority",
            "published_at",
            "view_count",            

            # تصویر و علاقه‌مندی
            "cover_image",
            "is_favorited",
            
        )
    def get_is_featured(self, obj) -> bool:
        return obj.has_active_feature
    @extend_schema_field(
        serializers.CharField(
            allow_null=True,
        )
    )

    def get_cover_image(self, obj):
        images = list(obj.images.all())

        cover = next(
            (image for image in images if image.is_cover),
            None,
        )

        if cover is None and images:
            cover = images[0]

        if not cover or not cover.image:
            return None

        return cover.image.url

    @extend_schema_field(
        serializers.BooleanField()
    )

    def get_is_favorited(self, obj):
        request = self.context.get("request")

        if not request:
            return False

        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            return False

        return obj.favorited_by.filter(
            user=user,
        ).exists()


    @extend_schema_field(
        serializers.ChoiceField(
            choices=FuelTypeChoices.choices,
            allow_null=True,
        )
    )

    def get_fuel_type(self, obj):
        if obj.trim_id:
            return obj.trim.fuel_type

        return None

    @extend_schema_field(
        serializers.ChoiceField(
            choices=TransmissionChoices.choices,
            allow_null=True,
        )
    )

    def get_transmission(self, obj):
        if obj.trim_id:
            return obj.trim.transmission

        return None

    @extend_schema_field(
        serializers.ChoiceField(
            choices=(
                ("dealer", "dealer"),
                ("personal", "personal"),
            ),
        )
    )

    def get_seller_type(self, obj):
        if obj.owner.role == User.Roles.DEALER:
            return "dealer"

        return "personal"

    @extend_schema_field(
        serializers.BooleanField()
    )

    def get_is_verified_dealer(self, obj):
        if obj.owner.role != User.Roles.DEALER:
            return False

        dealer_profile = getattr(
            obj.owner,
            "dealer_profile",
            None,
        )

        return bool(
            dealer_profile
            and dealer_profile.status
            == DealerProfile.Status.APPROVED
        )

        
class MyListingSerializer(ListingListSerializer):
    """Owner-only moderation feedback; never use for public inventory."""
    is_expired = serializers.SerializerMethodField()

    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + (
            "rejection_reason", "reviewed_at", "expires_at", "created_at", "is_expired", "paused_by_owner",
        )

    def get_is_expired(self, obj) -> bool:
        return bool(
            obj.status in (Listing.Status.PUBLISHED, Listing.Status.INACTIVE)
            and obj.expires_at and obj.expires_at <= timezone.now()
        )


class ListingComparisonSerializer(ListingListSerializer):
    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + ("insurance_months",)


class ListingComparisonResponseSerializer(serializers.Serializer):
    results = ListingComparisonSerializer(many=True)
    unavailable_ids = serializers.ListField(child=serializers.IntegerField())


class MyListingFilterSerializer(serializers.Serializer):
    search = serializers.CharField(max_length=150, required=False, allow_blank=True)
    ordering = serializers.ChoiceField(choices=["newest", "oldest", "price_low", "price_high", "most_viewed"], required=False)
    status = serializers.ChoiceField(
        choices=[*Listing.Status.values, "expired"], required=False,
    )


class ListingComparisonQuerySerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=9223372036854775807),
        min_length=1, max_length=3,
    )

    def validate_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("هر خودرو را فقط یک بار انتخاب کنید.")
        return value


class BrandMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = (
            "id",
            "name",
        )


class CarModelMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarModel
        fields = (
            "id",
            "name",
        )


class CarTrimMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarTrim
        fields = (
            "id",
            "name",
            "engine_volume",
            "transmission",
            "fuel_type",
        )

class ListingDetailSerializer(serializers.ModelSerializer):
    dealer_slug = serializers.SerializerMethodField()

    def get_dealer_slug(self, obj) -> str | None:
        profile = getattr(obj.owner, "dealer_profile", None)
        if profile and profile.status == DealerProfile.Status.APPROVED:
            return profile.slug
        return None

    is_favorited = serializers.SerializerMethodField()
    get_is_favorited = ListingListSerializer.get_is_favorited
    seller_type = serializers.SerializerMethodField()
    is_verified_dealer = serializers.SerializerMethodField()
    get_seller_type = ListingListSerializer.get_seller_type
    get_is_verified_dealer = ListingListSerializer.get_is_verified_dealer

    images = ListingImageSerializer(
        many=True,
        read_only=True,
    )

    owner_phone = serializers.SerializerMethodField()

    brand_name = serializers.CharField(
        source="brand.name",
        read_only=True,
    )
    car_model_name = serializers.CharField(
        source="car_model.name",
        read_only=True,
    )
    trim_name = serializers.CharField(
        source="trim.name",
        read_only=True,
        allow_null=True,
    )
    city_name = serializers.CharField(
        source="city.name",
        read_only=True,
    )
    neighborhood_name = serializers.CharField(
        source="neighborhood.name",
        read_only=True,
        allow_null=True,
    )
    body_type = serializers.CharField(
        source="car_model.body_type",
        read_only=True,
        allow_blank=True,
    )

    engine_volume = serializers.SerializerMethodField()
    fuel_type = serializers.SerializerMethodField()
    transmission = serializers.SerializerMethodField()
    raw_views_count = serializers.SerializerMethodField()
    daily_unique_views_count = serializers.SerializerMethodField()
    lifetime_unique_views_count = serializers.SerializerMethodField()
    is_featured = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "slug",
            "public_code",

            # مالک
            "owner",
            "owner_phone",
            "dealer_slug",
            "is_favorited",
            "seller_type",
            "is_verified_dealer",

            # خودرو
            "brand",
            "brand_name",
            "car_model",
            "car_model_name",
            "trim",
            "trim_name",
            "body_type",
            "engine_volume",
            "fuel_type",
            "transmission",
            "production_year",
            "mileage",
            "color",
            "interior_color",
            "usage_type",
            "engine_status",
            "transmission_status",
            "front_chassis_status",
            "rear_chassis_status",
            "owner_count",
            "document_status",
            "plate_type",
            "body_status",
            "body_note",

            # موقعیت
            "city",
            "city_name",
            "neighborhood",
            "neighborhood_name",
            "approximate_address",
            "latitude",
            "longitude",
            "hide_exact_location",

            # اطلاعات آگهی
            "title",
            "description",

            # قیمت و شرایط فروش
            "price",
            "price_type",
            "is_exchangeable",
            "is_installment",
            "down_payment",
            "installment_amount",
            "installment_count",
            "installment_description",

            # بیمه و معاینه فنی
            "insurance_months",
            "technical_inspection_valid_until",

            # وضعیت انتشار
            "status",
            "published_at",
            "expires_at",
            "sold_at",
            "inactive_at",
            "last_renewed_at",

            # امکانات ویژه
            "is_featured",
            "featured_at",
            "last_bumped_at",
            "featured_until",
            "featured_priority",
            # زمان‌ها
            "created_at",
            "updated_at",

            # بررسی مدیریت
            "rejection_reason",
            "reviewed_at",
            "is_edited",
            "edited_at",

            # تصاویر
            "images",

            # آمار بازدید
            "raw_views_count",
            "daily_unique_views_count",
            "lifetime_unique_views_count",
        )
        read_only_fields = (
            "id",
            "owner",
            "status",
            "published_at",
            "expires_at",
            "sold_at",
            "inactive_at",
            "is_featured",
            "featured_at",
            "last_bumped_at",
            "created_at",
            "updated_at",
            "rejection_reason",
            "reviewed_at",
            "is_edited",
            "edited_at",
            "images",
            "slug",
            "public_code",
            "last_renewed_at",
            "featured_until",
            "featured_priority",
        )

    def get_is_featured(self, obj) -> bool:
        return obj.has_active_feature
        
    @extend_schema_field(
        serializers.DecimalField(
            max_digits=3,
            decimal_places=1,
            allow_null=True,
        )
    )


    def get_engine_volume(self, obj):
        if obj.trim_id:
            return obj.trim.engine_volume

        return None


    @extend_schema_field(
        serializers.ChoiceField(
            choices=FuelTypeChoices.choices,
            allow_null=True,
        )
    )

    def get_fuel_type(self, obj):
        if obj.trim_id:
            return obj.trim.fuel_type

        return None


    @extend_schema_field(
        serializers.ChoiceField(
            choices=TransmissionChoices.choices,
            allow_null=True,
        )
    )


    def get_transmission(self, obj):
        if obj.trim_id:
            return obj.trim.transmission

        return None


    @extend_schema_field(
        serializers.CharField(
            allow_null=True,
        )
    )


    def get_owner_phone(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            return None

        if user.is_staff or user.is_superuser:
            return obj.owner.phone

        if (
            getattr(user, "first_name", None)
            and getattr(user, "last_name", None)
            and getattr(user, "city", None)
        ):
            return obj.owner.phone

        return None


    @extend_schema_field(
        serializers.IntegerField()
    )

    def get_raw_views_count(self, obj):
        return getattr(
            obj,
            "annotated_raw_views",
            0,
        ) or 0

    @extend_schema_field(
        serializers.IntegerField()
    )

    def get_daily_unique_views_count(self, obj):
        return getattr(
            obj,
            "annotated_daily_views",
            0,
        ) or 0

    @extend_schema_field(
        serializers.IntegerField()
    )

    def get_lifetime_unique_views_count(self, obj):
        users = getattr(
            obj,
            "annotated_lifetime_users",
            0,
        ) or 0

        guests = getattr(
            obj,
            "annotated_lifetime_guests",
            0,
        ) or 0

        return users + guests
    def to_representation(self, instance):
        data = super().to_representation(instance)

        request = self.context.get("request")
        user = getattr(request, "user", None)

        can_see_exact_location = bool(
            user
            and user.is_authenticated
            and (
                user.is_staff
                or user.is_superuser
                or instance.owner_id == user.id
            )
        )

        if (
            instance.hide_exact_location
            and not can_see_exact_location
        ):
            data["latitude"] = None
            data["longitude"] = None

        return data

class ImageIdListField(serializers.ListField):
    """Accept JSON arrays in multipart while keeping normal JSON/repeated IDs."""
    def get_value(self, dictionary):
        value = super().get_value(dictionary)
        if isinstance(value, list) and len(value) == 1 and isinstance(value[0], str) and value[0].startswith("["):
            try:
                return json.loads(value[0])
            except (ValueError, TypeError):
                return value[0]
        return value


class ListingCreateUpdateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(
            validators=[validate_listing_image],
        ),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    keep_image_ids = ImageIdListField(
        child=serializers.IntegerField(
            min_value=1,
        ),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    IMPORTANT_EDIT_FIELDS = {
        "city",
        "neighborhood",
        "brand",
        "car_model",
        "trim",
        "title",
        "description",
        "production_year",
        "mileage",
        "price",
        "price_type",
        "is_installment",
        "down_payment",
        "installment_amount",
        "installment_count",
        "color",
        "interior_color",
        "usage_type",
        "engine_status",
        "transmission_status",
        "front_chassis_status",
        "rear_chassis_status",
        "owner_count",
        "document_status",
        "plate_type",
        "body_status",
        "body_note",
        "insurance_months",
        "technical_inspection_valid_until",
        "approximate_address",
        "latitude",
        "longitude",
        "hide_exact_location",
        "is_exchangeable",
    }

    class Meta:
        model = Listing
        fields = (
            "id",
            "slug",
            "public_code",

            # مشخصات خودرو
            "brand",
            "car_model",
            "trim",
            "title",
            "description",
            "production_year",
            "mileage",
            "color",
            "interior_color",
            "usage_type",
            "engine_status",
            "transmission_status",
            "front_chassis_status",
            "rear_chassis_status",
            "owner_count",
            "document_status",
            "plate_type",
            "body_status",
            "body_note",

            # موقعیت
            "city",
            "neighborhood",
            "approximate_address",
            "latitude",
            "longitude",
            "hide_exact_location",

            # قیمت و شرایط فروش
            "price",
            "price_type",
            "is_exchangeable",
            "is_installment",
            "down_payment",
            "installment_amount",
            "installment_count",
            "installment_description",

            # بیمه و معاینه فنی
            "insurance_months",
            "technical_inspection_valid_until",

            # تصاویر
            "images",
            "keep_image_ids",

            # وضعیت
            "status",
        )
        read_only_fields = (
            "id",
            "status",
            "slug",
            "public_code",
        )
    def _validate_image_changes(
        self,
        attrs,
    ):
        uploaded_images = attrs.get(
            "images",
            [],
        )

        keep_image_ids = attrs.get(
            "keep_image_ids",
            None,
        )

        if self.instance is None:
            kept_count = 0
        else:
            existing_ids = set(
                self.instance.images.values_list(
                    "id",
                    flat=True,
                )
            )

            if keep_image_ids is None:
                kept_count = len(existing_ids)
            else:
                unique_keep_ids = set(
                    keep_image_ids
                )

                if (
                    len(unique_keep_ids)
                    != len(keep_image_ids)
                ):
                    raise serializers.ValidationError({
                        "keep_image_ids": (
                            "شناسه تصویر تکراری ارسال شده است."
                        )
                    })

                invalid_ids = (
                    unique_keep_ids
                    - existing_ids
                )

                if invalid_ids:
                    raise serializers.ValidationError({
                        "keep_image_ids": (
                            "یک یا چند تصویر متعلق "
                            "به این آگهی نیست."
                        )
                    })

                kept_count = len(
                    unique_keep_ids
                )

        total_images = (
            kept_count
            + len(uploaded_images)
        )

        if (
            total_images
            > settings.LISTING_MAX_IMAGES
        ):
            raise serializers.ValidationError({
                "images": (
                    "هر آگهی حداکثر "
                    f"{settings.LISTING_MAX_IMAGES} "
                    "تصویر می‌تواند داشته باشد."
                )
            })
    def validate(self, attrs):
        self._validate_image_changes(attrs)

        instance = self.instance

        price_type = attrs.get(
            "price_type",
            getattr(
                instance,
                "price_type",
                Listing.PriceType.FIXED,
            ),
        )

        price = attrs.get(
            "price",
            getattr(instance, "price", None),
        )

        is_installment = (
            price_type == Listing.PriceType.INSTALLMENT
        )

        # دیگر فرانت مجبور نیست is_installment را جدا بفرستد
        attrs["is_installment"] = is_installment

        # حالت تماس بگیرید قیمت ندارد
        if price_type == Listing.PriceType.CONTACT:
            attrs["price"] = None

        # بقیه انواع قیمت باید قیمت داشته باشند
        elif price is None or price <= 0:
            raise serializers.ValidationError({
                "price": (
                    "برای این نوع قیمت، "
                    "وارد کردن قیمت معتبر الزامی است."
                )
            })

        if is_installment:
            down_payment = attrs.get(
                "down_payment",
                getattr(
                    instance,
                    "down_payment",
                    None,
                ),
            )

            installment_amount = attrs.get(
                "installment_amount",
                getattr(
                    instance,
                    "installment_amount",
                    None,
                ),
            )

            installment_count = attrs.get(
                "installment_count",
                getattr(
                    instance,
                    "installment_count",
                    None,
                ),
            )

            errors = {}

            if (
                down_payment is None
                or down_payment <= 0
            ):
                errors["down_payment"] = (
                    "پیش‌پرداخت باید بیشتر از صفر باشد."
                )

            elif price and down_payment >= price:
                errors["down_payment"] = (
                    "پیش‌پرداخت باید کمتر از "
                    "قیمت کل خودرو باشد."
                )

            if (
                installment_amount is None
                or installment_amount <= 0
            ):
                errors["installment_amount"] = (
                    "مبلغ هر قسط باید بیشتر از صفر باشد."
                )

            if (
                installment_count is None
                or installment_count <= 0
            ):
                errors["installment_count"] = (
                    "تعداد اقساط باید بیشتر از صفر باشد."
                )

            if errors:
                raise serializers.ValidationError(errors)

        else:
            # وقتی آگهی دیگر اقساطی نیست،
            # اطلاعات اقساط قبلی نیز پاک شود
            attrs["down_payment"] = None
            attrs["installment_amount"] = None
            attrs["installment_count"] = None
            attrs["installment_description"] = ""

        # محله حتماً باید متعلق به شهر انتخاب‌شده باشد
        city = attrs.get(
            "city",
            getattr(instance, "city", None),
        )

        neighborhood = attrs.get(
            "neighborhood",
            getattr(instance, "neighborhood", None),
        )

        if (
            neighborhood
            and city
            and neighborhood.city_id != city.id
        ):
            raise serializers.ValidationError({
                "neighborhood": (
                    "محله انتخاب‌شده متعلق به شهر آگهی نیست."
                )
            })
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            def current_value(field_name):
                return attrs.get(
                    field_name,
                    getattr(instance, field_name, None),
                )

            brand = current_value("brand")
            car_model = current_value("car_model")
            trim = current_value("trim")
            city = current_value("city")

            duplicate_result = check_listing_duplicate(
                owner=request.user,
                exclude_id=instance.pk if instance else None,
                payload={
                    "brand_id": brand.id,
                    "car_model_id": car_model.id,
                    "trim_id": trim.id if trim else None,
                    "production_year": current_value(
                        "production_year",
                    ),
                    "mileage": current_value("mileage"),
                    "price": current_value("price"),
                    "city_id": city.id,
                },
            )

            if (
                duplicate_result.hard_duplicate
                or duplicate_result.time_window_duplicate
            ):
                raise serializers.ValidationError(
                    duplicate_result.reason
                )

            if duplicate_result.similar_duplicate:
                attrs["_duplicate_flag"] = {
                    "matched_id": (
                        duplicate_result.matched_listing.id
                    ),
                    "score": (
                        duplicate_result.similarity_score
                    ),
                }
        return attrs


    def create(self, validated_data):
        uploaded_images = validated_data.pop(
            "images",
            [],
        )
        validated_data.pop(
            "keep_image_ids",
            None,
        )
        duplicate_flag = validated_data.pop(
            "_duplicate_flag",
            None,
        )

        listing = Listing.objects.create(
            owner=self.context["request"].user,
            **validated_data,
        )

        for index, image in enumerate(uploaded_images):
            ListingImage.objects.create(
                listing=listing,
                image=image,
                is_cover=(index == 0),
                order=index,
            )

        if duplicate_flag:
            listing.needs_review = True
            listing.duplicate_of_id = duplicate_flag["matched_id"]
            listing.duplicate_score = duplicate_flag["score"]
            listing.status = Listing.Status.PENDING

            listing.save(
                update_fields=[
                    "needs_review",
                    "duplicate_of",
                    "duplicate_score",
                    "status",
                    "updated_at",
                ]
            )

        return listing

    def _save_images(
        self,
        instance,
        keep_image_ids,
        uploaded_images,
    ):
        # حذف تصاویر انتخاب‌نشده
        if keep_image_ids is not None:
            instance.images.exclude(
                id__in=keep_image_ids,
            ).delete()

        # افزودن تصاویر جدید
        if uploaded_images:
            last_image = instance.images.order_by(
                "-order",
            ).first()

            next_order = (
                last_image.order + 1
                if last_image
                else 0
            )

            for index, image in enumerate(uploaded_images):
                ListingImage.objects.create(
                    listing=instance,
                    image=image,
                    is_cover=False,
                    order=next_order + index,
                )

        if keep_image_ids is not None:
            appended = list(instance.images.exclude(id__in=keep_image_ids).order_by("order", "id"))
            retained = {image.id: image for image in instance.images.filter(id__in=keep_image_ids)}
            ordered = [retained[image_id] for image_id in keep_image_ids] + appended
            for order, image in enumerate(ordered):
                image.order = order
                image.is_cover = order == 0
            ListingImage.objects.bulk_update(ordered, ["order", "is_cover"])

        getattr(instance, "_prefetched_objects_cache", {}).pop("images", None)

        # اگر کاور وجود ندارد، اولین تصویر کاور شود
        images_queryset = instance.images.all()

        if images_queryset.exists():
            has_cover = images_queryset.filter(
                is_cover=True,
            ).exists()

            if not has_cover:
                first_image = images_queryset.order_by(
                    "order",
                    "id",
                ).first()

                first_image.is_cover = True
                first_image.save(
                    update_fields=["is_cover"],
                )

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop(
            "images",
            [],
        )
        keep_image_ids = validated_data.pop(
            "keep_image_ids",
            None,
        )
        duplicate_flag = validated_data.pop(
            "_duplicate_flag",
            None,
        )

        changed_important_fields = {
            field
            for field in validated_data.keys()
            if field in self.IMPORTANT_EDIT_FIELDS
        }

        has_image_changes = bool(
            uploaded_images
        ) or keep_image_ids is not None

        was_published = (
            instance.status == Listing.Status.PUBLISHED
        )

        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value,
            )

        if duplicate_flag:
            instance.needs_review = True
            instance.duplicate_of_id = duplicate_flag["matched_id"]
            instance.duplicate_score = duplicate_flag["score"]
            instance.status = Listing.Status.PENDING
            instance.reviewed_at = None

        if was_published and (
            changed_important_fields
            or has_image_changes
        ):
            instance.status = Listing.Status.PENDING
            instance.reviewed_at = None
            instance.is_edited = True
            instance.edited_at = timezone.now()

        instance.save()

        self._save_images(
            instance=instance,
            keep_image_ids=keep_image_ids,
            uploaded_images=uploaded_images,
        )

        return instance


class ListingStatusSubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = ()

    def validate(self, attrs):
        listing = self.instance

        if listing.status not in (
            Listing.Status.DRAFT,
            Listing.Status.NEEDS_EDIT,
        ):
            raise serializers.ValidationError(
                {
                    "status": (
                        "فقط آگهی‌های پیش‌نویس یا نیازمند اصلاح "
                        "قابل ارسال برای بررسی هستند."
                    )
                }
            )

        if not listing.images.exists():
            raise serializers.ValidationError(
                {
                    "images": (
                        "برای ثبت آگهی حداقل یک تصویر لازم است."
                    )
                }
            )

        return attrs

    def save(self, **kwargs):
        listing = self.instance

        allowed_statuses = (
            Listing.Status.DRAFT,
            Listing.Status.NEEDS_EDIT,
        )

        if listing.status not in allowed_statuses:
            raise serializers.ValidationError(
                {
                    "status": (
                        "فقط آگهی پیش‌نویس یا نیازمند اصلاح "
                        "قابل ارسال برای بررسی است."
                    )
                }
            )

        if not listing.images.exists():
            raise serializers.ValidationError(
                {
                    "images": (
                        "برای ثبت آگهی حداقل یک تصویر لازم است."
                    )
                }
            )

        listing.status = Listing.Status.PENDING

        update_fields = [
            "status",
            "updated_at",
        ]

        if listing.rejection_reason:
            listing.rejection_reason = ""
            update_fields.append("rejection_reason")

        if listing.reviewed_at is not None:
            listing.reviewed_at = None
            update_fields.append("reviewed_at")

        listing.save(
            update_fields=update_fields,
        )

        return listing


class ListingPublishSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = ()

    def save(self, **kwargs):
        listing = self.instance
        now = timezone.now()

        listing.status = Listing.Status.PUBLISHED
        listing.published_at = now
        listing.reviewed_at = now
        listing.is_edited = False
        listing.edited_at = None

        listing.save(
            update_fields=[
                "status",
                "published_at",
                "reviewed_at",
                "is_edited",
                "edited_at",
                "updated_at",
            ]
        )
        notify_listing_status(listing)
        return listing


class ListingStatusReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["published", "rejected", "needs_edit"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    expected_updated_at = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        from moderation.serializers import ListingModerationDecisionSerializer
        payload = dict(attrs)
        payload["action"] = {"published": "approve", "rejected": "reject", "needs_edit": "needs_edit"}[payload.pop("status")]
        self.decision = ListingModerationDecisionSerializer(instance=self.instance, data=payload, context=self.context)
        self.decision.is_valid(raise_exception=True)
        return attrs

    def save(self, **kwargs):
        self.instance = self.decision.save()
        return self.instance


class ListingActionResponseSerializer(
    serializers.Serializer
):
    detail = serializers.CharField(
        read_only=True,
    )


class ListingMarkSoldResponseSerializer(
    serializers.Serializer
):
    detail = serializers.CharField(
        read_only=True,
    )
    listing_id = serializers.IntegerField(
        read_only=True,
    )
    status = serializers.ChoiceField(
        choices=Listing.Status.choices,
        read_only=True,
    )
    sold_at = serializers.DateTimeField(
        read_only=True,
        allow_null=True,
    )
