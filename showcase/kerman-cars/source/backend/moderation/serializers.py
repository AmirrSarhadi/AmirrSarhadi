from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from listings.models import Listing
from .models import ListingReport, ModerationAction
from notifications.services import (
    notify_listing_status,
)

class ListingReportCreateSerializer(serializers.ModelSerializer):
    listing_id = serializers.IntegerField(write_only=True)
    description = serializers.CharField(required=False, allow_blank=True, max_length=3000)

    class Meta:
        model = ListingReport
        fields = ("listing_id", "reason", "description")

    def validate_listing_id(self, value):
        try:
            listing = Listing.objects.publicly_visible().get(id=value)
        except Listing.DoesNotExist:
            raise serializers.ValidationError("آگهی موردنظر پیدا نشد.")

        if listing.status != Listing.Status.PUBLISHED:
            raise serializers.ValidationError("فقط آگهی منتشرشده قابل گزارش است.")

        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if ListingReport.objects.filter(
            reporter=user,
            listing_id=attrs["listing_id"],
        ).exists():
            raise serializers.ValidationError(
                {"detail": "شما قبلاً این آگهی را گزارش کرده‌اید."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        listing = get_object_or_404(Listing.objects.publicly_visible(), id=validated_data.pop("listing_id"))
        report, created = ListingReport.objects.get_or_create(
            reporter=self.context["request"].user, listing=listing, defaults=validated_data,
        )
        if not created:
            raise serializers.ValidationError({"detail": "شما قبلاً این آگهی را گزارش کرده‌اید."})
        return report


class ListingReportListSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)

    class Meta:
        model = ListingReport
        fields = (
            "id",
            "listing",
            "listing_title",
            "reason",
            "description",
            "status",
            "created_at",
            "reviewed_at",
        )


class ModerationReportReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("resolve", "reject"))
    note = serializers.CharField(required=False, allow_blank=True, max_length=3000)

    @transaction.atomic
    def save(self, **kwargs):
        report = get_object_or_404(ListingReport.objects.select_for_update(), pk=self.instance.pk)
        if report.status != ListingReport.Status.PENDING:
            raise serializers.ValidationError({"detail": "این گزارش قبلاً بررسی شده است؛ وضعیت تازه را دریافت کنید."})
        admin_user = self.context["request"].user
        action = self.validated_data["action"]
        note = self.validated_data.get("note", "")

        report.status = (
            ListingReport.Status.RESOLVED
            if action == "resolve"
            else ListingReport.Status.REJECTED
        )
        report.reviewed_by = admin_user
        report.reviewed_at = timezone.now()
        report.save(update_fields=["status", "reviewed_by", "reviewed_at"])

        ModerationAction.objects.create(
            listing=report.listing,
            report=report,
            admin_user=admin_user,
            action=(
                ModerationAction.ActionType.RESOLVE_REPORT
                if action == "resolve"
                else ModerationAction.ActionType.REJECT_REPORT
            ),
            note=note,
        )
        from notifications.services import create_notification
        create_notification(
            user=report.reporter, kind="report_reviewed", title="نتیجهٔ بررسی گزارش شما",
            message="گزارش شما بررسی و رسیدگی شد." if action == "resolve" else "گزارش شما بررسی شد و مورد تأیید قرار نگرفت.",
            data={"report_id": report.pk, "status": report.status},
        )
        self.instance = report
        return report


class ListingModerationDecisionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("approve", "reject", "needs_edit"))
    rejection_reason = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    expected_updated_at = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        if attrs["action"] in ("reject", "needs_edit") and not attrs.get("rejection_reason", "").strip():
            raise serializers.ValidationError({"rejection_reason": "برای رد یا درخواست اصلاح، توضیح الزامی است."})
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        listing = get_object_or_404(Listing.objects.select_for_update(), pk=self.instance.pk)
        action = self.validated_data["action"]
        expected = self.validated_data.get("expected_updated_at")
        if expected is not None and expected != listing.updated_at:
            raise serializers.ValidationError({"detail": "آگهی پس از باز شدن صفحه تغییر کرده است. وضعیت تازه را دریافت و دوباره بررسی کنید."})
        allowed = {
            "approve": [Listing.Status.PENDING, Listing.Status.NEEDS_EDIT, Listing.Status.REJECTED],
            "reject": [Listing.Status.PENDING, Listing.Status.NEEDS_EDIT, Listing.Status.PUBLISHED],
            "needs_edit": [Listing.Status.PENDING, Listing.Status.PUBLISHED, Listing.Status.REJECTED],
        }
        if listing.status not in allowed[action]:
            raise serializers.ValidationError({"detail": "این تصمیم برای وضعیت فعلی آگهی مجاز نیست. وضعیت تازه را دریافت کنید."})
        if action == "approve" and listing.expires_at and listing.expires_at <= timezone.now():
            raise serializers.ValidationError({"detail": "زمان نمایش آگهی تمام شده است؛ تأیید بررسی به معنی تمدید آگهی نیست."})
        reason = self.validated_data.get("rejection_reason", "").strip()
        listing.reviewed_at = timezone.now()
        listing.status = {"approve": Listing.Status.PUBLISHED, "reject": Listing.Status.REJECTED, "needs_edit": Listing.Status.NEEDS_EDIT}[action]
        listing.rejection_reason = "" if action == "approve" else reason
        fields = ["status", "reviewed_at", "rejection_reason", "updated_at"]
        if action == "approve":
            listing.published_at = listing.published_at or timezone.now()
            listing.is_edited = False
            listing.edited_at = None
            fields += ["published_at", "is_edited", "edited_at"]
        listing.save(update_fields=fields)
        ModerationAction.objects.create(
            listing=listing, admin_user=self.context["request"].user,
            action={"approve": ModerationAction.ActionType.APPROVE_LISTING, "reject": ModerationAction.ActionType.REJECT_LISTING, "needs_edit": ModerationAction.ActionType.REQUEST_EDITS}[action],
            note="" if action == "approve" else reason,
        )
        notify_listing_status(listing)
        if action == "approve":
            from engagement.saved_search_alerts import notify_for_listing_safely
            transaction.on_commit(lambda listing_id=listing.pk: notify_for_listing_safely(listing_id))
        self.instance = listing
        return listing


class MyReportFilterSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ListingReport.Status.choices, required=False)
