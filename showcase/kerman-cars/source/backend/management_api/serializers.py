from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from accounts.models import DealerProfile, User
from listings.models import Listing
from listings.serializers import ListingImageSerializer
from moderation.models import ListingReport, ModerationAction
from django.db.models import Q
from billing.models import Payment
from subscriptions.models import (
    SubscriptionPlan,
    SubscriptionUsage,
    UserSubscription,
)
from subscriptions.serializers import (
    SubscriptionUsageSerializer,
)
from cars.models import (
    BodyTypeChoices,
    Brand,
    CarModel,
    CarTrim,
    FuelTypeChoices,
    TransmissionChoices,
)
from locations.models import (
    City,
    Neighborhood,
    Province,
)

from homepage.models import Banner, HomepageSettings, MagazineArticle, HomepageFAQ
from drf_spectacular.utils import extend_schema_field

class AdminUserFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=150,
        trim_whitespace=True,
    )
    role = serializers.ChoiceField(
        required=False,
        choices=User.Roles.choices,
    )
    is_active = serializers.BooleanField(
        required=False,
    )
    is_banned = serializers.BooleanField(
        required=False,
    )


class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(
        read_only=True,
    )
    city_name = serializers.CharField(
        source="city.name",
        read_only=True,
        allow_null=True,
    )
    dealer_status = serializers.SerializerMethodField()
    listings_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    reports_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "first_name",
            "last_name",
            "full_name",
            "national_id",
            "email",
            "role",
            "city",
            "city_name",
            "is_phone_verified",
            "is_active",
            "is_banned",
            "is_staff",
            "is_superuser",
            "dealer_status",
            "listings_count",
            "reports_count",
            "date_joined",
        )
        read_only_fields = fields


    @extend_schema_field(
        serializers.ChoiceField(
            choices=DealerProfile.Status.choices,
            allow_null=True,
        )
    )


    def get_dealer_status(self, obj):
        dealer_profile = getattr(
            obj,
            "dealer_profile",
            None,
        )

        if dealer_profile is None:
            return None

        return dealer_profile.status


class AdminUserStatusSerializer(serializers.Serializer):
    is_banned = serializers.BooleanField()

    def validate_is_banned(self, value):
        request = self.context["request"]
        target_user = self.instance

        if value and target_user.pk == request.user.pk:
            raise serializers.ValidationError(
                "مدیر نمی‌تواند حساب خودش را مسدود کند."
            )

        if (
            value
            and target_user.is_superuser
            and not request.user.is_superuser
        ):
            raise serializers.ValidationError(
                "فقط مدیر ارشد می‌تواند مدیر ارشد دیگری را مسدود کند."
            )

        return value

    def update(self, instance, validated_data):
        instance.is_banned = validated_data["is_banned"]
        instance.save(
            update_fields=["is_banned"],
        )
        return instance


class AdminDealerFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=150,
        trim_whitespace=True,
    )
    status = serializers.ChoiceField(
        required=False,
        choices=DealerProfile.Status.choices,
    )
    city = serializers.IntegerField(
        required=False,
        min_value=1,
    )


class AdminDealerSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(
        source="user.phone",
        read_only=True,
    )
    user_full_name = serializers.CharField(
        source="user.full_name",
        read_only=True,
    )
    user_is_banned = serializers.BooleanField(
        source="user.is_banned",
        read_only=True,
    )
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
        default=0,
    )

    class Meta:
        model = DealerProfile
        fields = (
            "id",
            "user",
            "user_phone",
            "user_full_name",
            "user_is_banned",
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
            "license_document",
            "national_card_document",
            "manager_name",
            "business_hours",
            "city",
            "city_name",
            "neighborhood",
            "neighborhood_name",
            "latitude",
            "longitude",
            "status",
            "rejection_reason",
            "verified_at",
            "status_updated_at",
            "created_at",
            "updated_at",
            "listings_count",
        )
        read_only_fields = fields


class AdminDealerDecisionSerializer(serializers.Serializer):
    expected_updated_at = serializers.DateTimeField(required=False)
    status = serializers.ChoiceField(
        choices=(
            (
                DealerProfile.Status.APPROVED,
                "تأیید",
            ),
            (
                DealerProfile.Status.REJECTED,
                "رد",
            ),
            (
                DealerProfile.Status.SUSPENDED,
                "تعلیق",
            ),
        ),
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        new_status = attrs["status"]
        reason = attrs.get("reason", "").strip()

        if new_status in (
            DealerProfile.Status.REJECTED,
            DealerProfile.Status.SUSPENDED,
        ) and not reason:
            raise serializers.ValidationError({
                "reason": (
                    "برای رد یا تعلیق بنگاه، وارد کردن دلیل الزامی است."
                )
            })

        attrs["reason"] = reason
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        instance = DealerProfile.objects.select_for_update().get(pk=instance.pk)
        expected = validated_data.get("expected_updated_at")
        if expected is not None and instance.updated_at != expected:
            raise serializers.ValidationError({"detail": "اطلاعات نمایشگاه تغییر کرده است؛ وضعیت تازه را دریافت و دوباره بررسی کنید."})
        new_status = validated_data["status"]
        reason = validated_data["reason"]
        user = User.objects.select_for_update().get(pk=instance.user_id)
        if new_status == instance.status:
            raise serializers.ValidationError({"detail": "این وضعیت قبلاً ثبت شده است؛ وضعیت تازه را دریافت کنید."})
        if new_status == DealerProfile.Status.SUSPENDED and instance.status != DealerProfile.Status.APPROVED:
            raise serializers.ValidationError({"detail": "فقط نمایشگاه تأییدشده قابل تعلیق است."})

        instance.status = new_status

        if new_status == DealerProfile.Status.APPROVED:
            instance.rejection_reason = ""

            if instance.verified_at is None:
                instance.verified_at = timezone.now()

            if user.role != User.Roles.DEALER:
                user.role = User.Roles.DEALER
                user.save(
                    update_fields=["role"],
                )

        elif new_status == DealerProfile.Status.REJECTED:
            instance.rejection_reason = reason
            instance.verified_at = None

            if user.role != User.Roles.PERSONAL:
                user.role = User.Roles.PERSONAL
                user.save(
                    update_fields=["role"],
                )

        else:
            # در حالت suspended هویت حساب بنگاهی
            # حفظ می‌شود، ولی امکانات آن مسدود خواهد شد.
            instance.rejection_reason = reason

        instance.save()
        from notifications.services import create_notification
        titles = {"approved": "نمایشگاه شما تأیید شد", "rejected": "درخواست نمایشگاه رد شد", "suspended": "نمایشگاه شما تعلیق شد"}
        create_notification(user=user, kind=f"dealer_{new_status}", title=titles[new_status],
            message=reason or "اکنون می‌توانید وارد پنل نمایشگاه شوید و اطلاعات و آگهی‌ها را مدیریت کنید.",
            data={"dealer_id": instance.pk, "status": new_status})
        return instance


class AdminListingFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=200,
        trim_whitespace=True,
    )
    status = serializers.ChoiceField(
        required=False,
        choices=Listing.Status.choices,
    )
    owner = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    brand = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    car_model = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    city = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    seller_type = serializers.ChoiceField(
        required=False,
        choices=(
            ("personal", "کاربر شخصی"),
            ("dealer", "بنگاه"),
        ),
    )
    is_featured = serializers.BooleanField(
        required=False,
    )
    is_deleted = serializers.BooleanField(
        required=False,
    )
    has_reports = serializers.BooleanField(
        required=False,
    )
    ordering = serializers.ChoiceField(
        required=False,
        choices=(
            ("newest", "جدیدترین"),
            ("oldest", "قدیمی‌ترین"),
            ("updated", "آخرین ویرایش"),
            ("most_viewed", "پربازدیدترین"),
            ("most_reported", "بیشترین گزارش"),
        ),
    )


class AdminListingListSerializer(serializers.ModelSerializer):
    owner_phone = serializers.CharField(
        source="owner.phone",
        read_only=True,
    )
    owner_full_name = serializers.CharField(
        source="owner.full_name",
        read_only=True,
    )
    seller_type = serializers.SerializerMethodField()

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

    cover_image = serializers.SerializerMethodField()
    view_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    reports_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    is_deleted = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "slug",
            "public_code",
            "title",
            "owner",
            "owner_phone",
            "owner_full_name",
            "seller_type",
            "brand",
            "brand_name",
            "car_model",
            "car_model_name",
            "trim",
            "trim_name",
            "city",
            "city_name",
            "neighborhood",
            "neighborhood_name",
            "production_year",
            "mileage",
            "price",
            "price_type",
            "status",
            "rejection_reason",
            "is_featured",
            "featured_at",
            "featured_until",
            "featured_priority",
            "last_bumped_at",
            "published_at",
            "expires_at",
            "sold_at",
            "deleted_at",
            "is_deleted",
            "view_count",
            "reports_count",
            "cover_image",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

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

    def get_is_deleted(self, obj):
        return obj.deleted_at is not None

    @extend_schema_field(
        serializers.CharField(
            allow_null=True,
        )
    )

    def get_cover_image(self, obj):
        images = list(obj.images.all())

        cover = next(
            (
                image
                for image in images
                if image.is_cover
            ),
            None,
        )

        if cover is None and images:
            cover = images[0]

        if not cover or not cover.image:
            return None

        request = self.context.get("request")
        image_url = cover.image.url

        if request:
            return request.build_absolute_uri(image_url)

        return image_url


class AdminListingDetailSerializer(serializers.ModelSerializer):
    is_expired = serializers.SerializerMethodField()

    def get_is_expired(self, obj) -> bool:
        return bool(obj.expires_at and obj.expires_at <= timezone.now())

    owner_phone = serializers.CharField(
        source="owner.phone",
        read_only=True,
    )
    owner_full_name = serializers.CharField(
        source="owner.full_name",
        read_only=True,
    )
    owner_role = serializers.CharField(
        source="owner.role",
        read_only=True,
    )

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

    images = ListingImageSerializer(
        many=True,
        read_only=True,
    )
    view_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    reports_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = Listing
        fields = "__all__"


class AdminReportFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=200,
        trim_whitespace=True,
    )
    status = serializers.ChoiceField(
        required=False,
        choices=ListingReport.Status.choices,
    )
    reason = serializers.ChoiceField(
        required=False,
        choices=ListingReport.Reason.choices,
    )
    listing = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    reporter = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    ordering = serializers.ChoiceField(
        required=False,
        choices=(
            ("newest", "جدیدترین"),
            ("oldest", "قدیمی‌ترین"),
        ),
    )


class AdminReportSerializer(serializers.ModelSerializer):
    reporter_phone = serializers.CharField(
        source="reporter.phone",
        read_only=True,
    )
    reporter_full_name = serializers.CharField(
        source="reporter.full_name",
        read_only=True,
    )
    listing_title = serializers.CharField(
        source="listing.title",
        read_only=True,
    )
    listing_public_code = serializers.CharField(
        source="listing.public_code",
        read_only=True,
    )
    listing_owner_phone = serializers.CharField(
        source="listing.owner.phone",
        read_only=True,
    )
    reviewed_by_phone = serializers.CharField(
        source="reviewed_by.phone",
        read_only=True,
        allow_null=True,
    )
    review_note = serializers.SerializerMethodField()

    class Meta:
        model = ListingReport
        fields = (
            "id",
            "reporter",
            "reporter_phone",
            "reporter_full_name",
            "listing",
            "listing_title",
            "listing_public_code",
            "listing_owner_phone",
            "reason",
            "description",
            "status",
            "reviewed_by",
            "reviewed_by_phone",
            "reviewed_at",
            "review_note",
            "created_at",
        )
        read_only_fields = fields

    @extend_schema_field(
        serializers.CharField()
    )

    def get_review_note(self, obj):
        actions = list(obj.actions.all())

        if not actions:
            return ""

        return actions[0].note


class AdminPlanFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=150,
        trim_whitespace=True,
    )
    is_active = serializers.BooleanField(
        required=False,
    )


class AdminPlanSerializer(serializers.ModelSerializer):
    subscriptions_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = SubscriptionPlan
        fields = (
            "id",
            "name",
            "slug",
            "price",
            "duration_days",
            "max_active_listings",
            "monthly_listing_quota",
            "featured_quota",
            "bump_quota",
            "feature_duration_days",
            "bump_cooldown_hours",
            "priority_level",
            "is_active",
            "subscriptions_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "subscriptions_count",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        instance = self.instance

        max_active_listings = attrs.get(
            "max_active_listings",
            getattr(
                instance,
                "max_active_listings",
                0,
            ),
        )
        monthly_listing_quota = attrs.get(
            "monthly_listing_quota",
            getattr(
                instance,
                "monthly_listing_quota",
                0,
            ),
        )

        if monthly_listing_quota < max_active_listings:
            raise serializers.ValidationError({
                "monthly_listing_quota": (
                    "سهمیه ثبت آگهی در هر دوره نباید کمتر از "
                    "حداکثر آگهی‌های فعال باشد."
                )
            })

        return attrs


class AdminSubscriptionFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=150,
        trim_whitespace=True,
    )
    status = serializers.ChoiceField(
        required=False,
        choices=UserSubscription.Status.choices,
    )
    user = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    plan = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    auto_renew = serializers.BooleanField(
        required=False,
    )


class AdminSubscriptionSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(
        source="user.phone",
        read_only=True,
    )
    user_full_name = serializers.CharField(
        source="user.full_name",
        read_only=True,
    )
    plan_name = serializers.CharField(
        source="plan.name",
        read_only=True,
    )

    remaining_listing_quota = serializers.IntegerField(
        read_only=True,
    )
    remaining_featured_quota = serializers.IntegerField(
        read_only=True,
    )
    remaining_bump_quota = serializers.IntegerField(
        read_only=True,
    )
    is_valid = serializers.BooleanField(
        read_only=True,
    )
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = (
            "id",
            "user",
            "user_phone",
            "user_full_name",
            "plan",
            "plan_name",
            "status",
            "started_at",
            "expires_at",
            "used_listing_quota",
            "used_featured_quota",
            "used_bump_quota",
            "remaining_listing_quota",
            "remaining_featured_quota",
            "remaining_bump_quota",
            "auto_renew",
            "is_valid",
            "payment_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(
        serializers.ChoiceField(
            choices=Payment.Status.choices,
            allow_null=True,
        )
    )

    def get_payment_status(self, obj):
        try:
            return obj.payment.status
        except Payment.DoesNotExist:
            return None


class AdminSubscriptionDetailSerializer(
    AdminSubscriptionSerializer
):
    usages = SubscriptionUsageSerializer(
        many=True,
        read_only=True,
    )

    class Meta(AdminSubscriptionSerializer.Meta):
        fields = (
            *AdminSubscriptionSerializer.Meta.fields,
            "usages",
        )


class AdminSubscriptionActionSerializer(
    serializers.Serializer
):
    action = serializers.ChoiceField(
        choices=(
            ("activate", "فعال‌سازی"),
            ("cancel", "لغو"),
            ("expire", "منقضی‌کردن"),
        )
    )

    def validate(self, attrs):
        subscription = self.instance
        action = attrs["action"]

        if (
            action == "activate"
            and subscription.status
            != UserSubscription.Status.PENDING
        ):
            raise serializers.ValidationError({
                "action": (
                    "فقط اشتراک در انتظار را می‌توان فعال کرد."
                )
            })

        if action == "activate":
            active_exists = (
                UserSubscription.objects
                .filter(
                    user=subscription.user,
                    status=UserSubscription.Status.ACTIVE,
                )
                .exclude(pk=subscription.pk)
                .filter(
                    Q(expires_at__isnull=True)
                    | Q(expires_at__gt=timezone.now())
                )
                .exists()
            )

            if active_exists:
                raise serializers.ValidationError({
                    "action": (
                        "این کاربر در حال حاضر اشتراک فعال دارد."
                    )
                })

        if (
            action == "cancel"
            and subscription.status
            not in (
                UserSubscription.Status.PENDING,
                UserSubscription.Status.ACTIVE,
            )
        ):
            raise serializers.ValidationError({
                "action": (
                    "فقط اشتراک فعال یا در انتظار قابل لغو است."
                )
            })

        if (
            action == "expire"
            and subscription.status
            != UserSubscription.Status.ACTIVE
        ):
            raise serializers.ValidationError({
                "action": (
                    "فقط اشتراک فعال را می‌توان منقضی کرد."
                )
            })

        return attrs

    def update(self, instance, validated_data):
        action = validated_data["action"]

        if action == "activate":
            instance.activate()
            return instance

        instance.auto_renew = False

        if action == "cancel":
            instance.status = (
                UserSubscription.Status.CANCELED
            )
            instance.save(
                update_fields=[
                    "status",
                    "auto_renew",
                    "updated_at",
                ]
            )
            return instance

        instance.status = UserSubscription.Status.EXPIRED
        instance.expires_at = timezone.now()
        instance.save(
            update_fields=[
                "status",
                "expires_at",
                "auto_renew",
                "updated_at",
            ]
        )
        return instance


class AdminPaymentFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=150,
        trim_whitespace=True,
    )
    status = serializers.ChoiceField(
        required=False,
        choices=Payment.Status.choices,
    )
    provider = serializers.ChoiceField(
        required=False,
        choices=Payment.Provider.choices,
    )
    user = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    plan = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    subscription = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    min_amount = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    max_amount = serializers.IntegerField(
        required=False,
        min_value=0,
    )

    def validate(self, attrs):
        min_amount = attrs.get("min_amount")
        max_amount = attrs.get("max_amount")

        if (
            min_amount is not None
            and max_amount is not None
            and min_amount > max_amount
        ):
            raise serializers.ValidationError({
                "max_amount": (
                    "حداکثر مبلغ نمی‌تواند کمتر از حداقل مبلغ باشد."
                )
            })

        return attrs


class AdminPaymentSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(
        source="user.phone",
        read_only=True,
    )
    user_full_name = serializers.CharField(
        source="user.full_name",
        read_only=True,
    )
    plan_name = serializers.CharField(
        source="plan.name",
        read_only=True,
    )
    subscription_status = serializers.CharField(
        source="subscription.status",
        read_only=True,
    )

    class Meta:
        model = Payment
        fields = (
            "id",
            "user",
            "user_phone",
            "user_full_name",
            "subscription",
            "subscription_status",
            "plan",
            "plan_name",
            "provider",
            "amount",
            "status",
            "authority",
            "ref_id",
            "paid_at",
            "failure_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AdminPaymentActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=(
            ("cancel", "لغو پرداخت"),
        )
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        payment = self.instance

        if payment.status != Payment.Status.PENDING:
            raise serializers.ValidationError({
                "action": (
                    "فقط پرداخت در انتظار را می‌توان لغو کرد."
                )
            })

        return attrs

    def update(self, instance, validated_data):
        reason = (
            validated_data.get("reason", "").strip()
            or "پرداخت توسط مدیر لغو شد."
        )

        instance.status = Payment.Status.CANCELED
        instance.failure_reason = reason
        instance.save(
            update_fields=[
                "status",
                "failure_reason",
                "updated_at",
            ]
        )

        subscription = instance.subscription

        if (
            subscription.status
            == UserSubscription.Status.PENDING
        ):
            subscription.status = (
                UserSubscription.Status.CANCELED
            )
            subscription.auto_renew = False
            subscription.save(
                update_fields=[
                    "status",
                    "auto_renew",
                    "updated_at",
                ]
            )

        return instance

class AdminBrandFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=100,
        trim_whitespace=True,
    )
    is_active = serializers.BooleanField(
        required=False,
    )


class AdminBrandSerializer(serializers.ModelSerializer):
    models_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    listings_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = Brand
        fields = (
            "id",
            "name",
            "logo",
            "is_active",
            "sort_order",
            "models_count",
            "listings_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "models_count",
            "listings_count",
            "created_at",
            "updated_at",
        )


class AdminCarModelFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=100,
        trim_whitespace=True,
    )
    brand = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    body_type = serializers.ChoiceField(
        required=False,
        choices=BodyTypeChoices.choices,
    )
    is_active = serializers.BooleanField(
        required=False,
    )


class AdminCarModelSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(
        source="brand.name",
        read_only=True,
    )
    trims_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    listings_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = CarModel
        fields = (
            "id",
            "brand",
            "brand_name",
            "name",
            "body_type",
            "is_active",
            "sort_order",
            "trims_count",
            "listings_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "brand_name",
            "trims_count",
            "listings_count",
            "created_at",
            "updated_at",
        )


class AdminCarTrimFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=100,
        trim_whitespace=True,
    )
    brand = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    car_model = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    fuel_type = serializers.ChoiceField(
        required=False,
        choices=FuelTypeChoices.choices,
    )
    transmission = serializers.ChoiceField(
        required=False,
        choices=TransmissionChoices.choices,
    )
    is_active = serializers.BooleanField(
        required=False,
    )


class AdminCarTrimSerializer(serializers.ModelSerializer):
    car_model_name = serializers.CharField(
        source="car_model.name",
        read_only=True,
    )
    brand = serializers.IntegerField(
        source="car_model.brand_id",
        read_only=True,
    )
    brand_name = serializers.CharField(
        source="car_model.brand.name",
        read_only=True,
    )
    listings_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = CarTrim
        fields = (
            "id",
            "brand",
            "brand_name",
            "car_model",
            "car_model_name",
            "name",
            "engine_volume",
            "fuel_type",
            "transmission",
            "is_active",
            "sort_order",
            "listings_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "brand",
            "brand_name",
            "car_model_name",
            "listings_count",
            "created_at",
            "updated_at",
        )


class AdminProvinceFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=100,
        trim_whitespace=True,
    )
    is_active = serializers.BooleanField(
        required=False,
    )


class AdminProvinceSerializer(serializers.ModelSerializer):
    cities_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = Province
        fields = (
            "id",
            "name",
            "is_active",
            "cities_count",
        )
        read_only_fields = (
            "id",
            "cities_count",
        )


class AdminCityFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=100,
        trim_whitespace=True,
    )
    province = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    is_active = serializers.BooleanField(
        required=False,
    )


class AdminCitySerializer(serializers.ModelSerializer):
    province_name = serializers.CharField(
        source="province.name",
        read_only=True,
    )
    neighborhoods_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    listings_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )
    users_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = City
        fields = (
            "id",
            "province",
            "province_name",
            "name",
            "is_active",
            "neighborhoods_count",
            "listings_count",
            "users_count",
        )
        read_only_fields = (
            "id",
            "province_name",
            "neighborhoods_count",
            "listings_count",
            "users_count",
        )


class AdminNeighborhoodFilterSerializer(
    serializers.Serializer
):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=100,
        trim_whitespace=True,
    )
    province = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    city = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    is_active = serializers.BooleanField(
        required=False,
    )


class AdminNeighborhoodSerializer(
    serializers.ModelSerializer
):
    city_name = serializers.CharField(
        source="city.name",
        read_only=True,
    )
    province = serializers.IntegerField(
        source="city.province_id",
        read_only=True,
    )
    province_name = serializers.CharField(
        source="city.province.name",
        read_only=True,
    )
    listings_count = serializers.IntegerField(
        read_only=True,
        default=0,
    )

    class Meta:
        model = Neighborhood
        fields = (
            "id",
            "province",
            "province_name",
            "city",
            "city_name",
            "name",
            "is_active",
            "listings_count",
        )
        read_only_fields = (
            "id",
            "province",
            "province_name",
            "city_name",
            "listings_count",
        )

class AdminBannerFilterSerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=150,
        trim_whitespace=True,
    )
    position = serializers.ChoiceField(
        required=False,
        choices=Banner.Position.choices,
    )
    is_active = serializers.BooleanField(
        required=False,
    )


class AdminBannerSerializer(serializers.ModelSerializer):
    is_currently_visible = (
        serializers.SerializerMethodField()
    )

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
            "is_active",
            "is_currently_visible",
            "starts_at",
            "ends_at",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "is_currently_visible",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        instance = self.instance

        starts_at = attrs.get(
            "starts_at",
            getattr(instance, "starts_at", None),
        )
        ends_at = attrs.get(
            "ends_at",
            getattr(instance, "ends_at", None),
        )

        if (
            starts_at
            and ends_at
            and ends_at <= starts_at
        ):
            raise serializers.ValidationError({
                "ends_at": (
                    "زمان پایان نمایش باید بعد از زمان شروع باشد."
                )
            })

        return attrs

    @extend_schema_field(
        serializers.BooleanField()
    )

    def get_is_currently_visible(self, obj):
        now = timezone.now()

        if not obj.is_active:
            return False

        if obj.starts_at and obj.starts_at > now:
            return False

        if obj.ends_at and obj.ends_at <= now:
            return False

        return True


class AdminHomepageSettingsSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = HomepageSettings
        fields = (
            "id",
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
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

class AdminDashboardUserStatsSerializer(
    serializers.Serializer
):
    total = serializers.IntegerField(read_only=True)
    active = serializers.IntegerField(read_only=True)
    banned = serializers.IntegerField(read_only=True)
    new_30_days = serializers.IntegerField(read_only=True)


class AdminDashboardDealerStatsSerializer(
    serializers.Serializer
):
    total = serializers.IntegerField(read_only=True)
    pending = serializers.IntegerField(read_only=True)
    approved = serializers.IntegerField(read_only=True)
    rejected = serializers.IntegerField(read_only=True)
    suspended = serializers.IntegerField(read_only=True)


class AdminDashboardListingStatsSerializer(
    serializers.Serializer
):
    total = serializers.IntegerField(read_only=True)
    draft = serializers.IntegerField(read_only=True)
    pending = serializers.IntegerField(read_only=True)
    published = serializers.IntegerField(read_only=True)
    sold = serializers.IntegerField(read_only=True)
    inactive = serializers.IntegerField(read_only=True)
    new_30_days = serializers.IntegerField(read_only=True)


class AdminDashboardReportStatsSerializer(
    serializers.Serializer
):
    total = serializers.IntegerField(read_only=True)
    pending = serializers.IntegerField(read_only=True)
    resolved = serializers.IntegerField(read_only=True)
    rejected = serializers.IntegerField(read_only=True)


class AdminDashboardSubscriptionStatsSerializer(
    serializers.Serializer
):
    total = serializers.IntegerField(read_only=True)
    active = serializers.IntegerField(read_only=True)
    pending = serializers.IntegerField(read_only=True)
    expired = serializers.IntegerField(read_only=True)


class AdminDashboardPaymentStatsSerializer(
    serializers.Serializer
):
    total = serializers.IntegerField(read_only=True)
    paid = serializers.IntegerField(read_only=True)
    pending = serializers.IntegerField(read_only=True)
    failed = serializers.IntegerField(read_only=True)
    total_revenue = serializers.IntegerField(read_only=True)
    revenue_30_days = serializers.IntegerField(read_only=True)


class AdminDashboardSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField(read_only=True)

    users = AdminDashboardUserStatsSerializer(
        read_only=True,
    )
    dealers = AdminDashboardDealerStatsSerializer(
        read_only=True,
    )
    listings = AdminDashboardListingStatsSerializer(
        read_only=True,
    )
    reports = AdminDashboardReportStatsSerializer(
        read_only=True,
    )
    subscriptions = (
        AdminDashboardSubscriptionStatsSerializer(
            read_only=True,
        )
    )
    payments = AdminDashboardPaymentStatsSerializer(
        read_only=True,
    )

class AdminContentFilterSerializer(serializers.Serializer):
    search = serializers.CharField(required=False, max_length=150, allow_blank=False)
    is_active = serializers.BooleanField(required=False)


class AdminArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = MagazineArticle
        fields = ("id", "title", "slug", "excerpt", "content", "cover_image", "cover_alt", "is_active", "published_at", "created_at", "updated_at")
        read_only_fields = ("id", "slug", "created_at", "updated_at")

    def validate_cover_image(self, value):
        if value:
            from listings.validators import validate_listing_image
            validate_listing_image(value)
        return value


class AdminFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageFAQ
        fields = ("id", "question", "answer", "sort_order", "is_active", "updated_at")
        read_only_fields = ("id", "updated_at")


class AdminListingHistorySerializer(serializers.ModelSerializer):
    reviewer = serializers.CharField(source="admin_user.full_name", read_only=True, default="مدیر حذف‌شده")
    action_label = serializers.CharField(source="get_action_display", read_only=True)
    class Meta:
        model = ModerationAction
        fields = ["id", "action", "action_label", "reviewer", "note", "created_at"]
