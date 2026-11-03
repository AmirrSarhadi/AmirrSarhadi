from rest_framework import serializers
from .access import visible_records

from .models import Company, Person


COMMON = ("id", "organization_id", "owner_id", "owner_label", "created_by_id", "created_at", "updated_at", "version", "archived_at", "is_merged", "merged_into_id")


class CustomerSerializer(serializers.ModelSerializer):
    owner_label = serializers.SerializerMethodField()
    is_merged = serializers.SerializerMethodField()
    merged_into_id = serializers.SerializerMethodField()

    def get_is_merged(self, record):
        return record.merged_into_id is not None

    def get_merged_into_id(self, record):
        membership = self.context.get("membership")
        if record.merged_into_id and membership and visible_records(type(record), membership).filter(pk=record.merged_into_id).exists():
            return str(record.merged_into_id)
        return None

    def get_owner_label(self, record):
        return record.owner.user.get_full_name().strip() or record.owner.user.get_username()


class PersonSerializer(CustomerSerializer):
    customer_code = serializers.SerializerMethodField()
    created_by_label = serializers.SerializerMethodField()
    activity_count = serializers.IntegerField(read_only=True, default=0)
    primary_company_id = serializers.UUIDField(required=False, allow_null=True)
    primary_company_label = serializers.SerializerMethodField()
    has_primary_company = serializers.SerializerMethodField()
    company_label = serializers.SerializerMethodField()

    def get_customer_code(self, record):
        return f"CUS{record.customer_number:05}" if record.customer_number is not None else None

    def get_created_by_label(self, record):
        member = self.context.get("membership")
        if member and (member.role in {"owner", "admin"} or record.created_by_id == member.user_id):
            return record.created_by.get_full_name().strip() or record.created_by.get_username()
        return "عضو سازمان"

    def primary_visible(self, record):
        member = self.context.get("membership")
        if hasattr(record, "primary_visible") and record.primary_company_id == record.reference_primary_id:
            return record.primary_visible
        return bool(member and record.primary_company_id and visible_records(Company, member).filter(pk=record.primary_company_id).exists())

    def get_primary_company_label(self, record):
        return record.primary_company.name if record.primary_company_id and self.primary_visible(record) else None

    def get_has_primary_company(self, record):
        return bool(record.primary_company_id)

    def get_company_label(self, record):
        return self.get_primary_company_label(record) or getattr(record, "linked_company_label", None)

    def validate_primary_company_id(self, value):
        if self.instance and value == self.instance.primary_company_id:
            return value
        member = self.context.get("membership")
        if value and (not member or not visible_records(Company, member).filter(pk=value, archived_at__isnull=True, merged_into__isnull=True).exists()):
            raise serializers.ValidationError("شرکت انتخاب‌شده در دسترس نیست.")
        return value

    def to_representation(self, record):
        data = super().to_representation(record)
        if record.primary_company_id and not self.primary_visible(record):
            data["primary_company_id"] = None
        return data

    class Meta:
        model = Person
        fields = COMMON + ("customer_code", "created_by_label", "activity_count", "customer_type", "primary_company_id", "primary_company_label", "has_primary_company", "company_label", "industry", "street", "city", "province", "postal_code", "website", "notes", "first_name", "last_name", "title", "source", "status", "phones", "emails", "tags")
        read_only_fields = COMMON + ("customer_code", "created_by_label", "activity_count", "primary_company_label", "has_primary_company", "company_label")
        validators = []


class CompanySerializer(CustomerSerializer):
    class Meta:
        model = Company
        fields = COMMON + ("name", "registration_number", "phones", "emails", "legal_name", "industry", "size", "website", "addresses", "tags")
        read_only_fields = COMMON
        validators = []


class WriteMetadata(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    owner_id = serializers.IntegerField(min_value=1, required=False)


class RelationInput(serializers.Serializer):
    person_version = serializers.IntegerField(min_value=1)
    company_version = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=160, allow_blank=True, required=False)
