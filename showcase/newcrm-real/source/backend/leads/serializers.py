from rest_framework import serializers
from customers.access import visible_records
from customers.models import Person, Company
from .models import Lead

COMMON = ("id", "organization_id", "owner_id", "owner_label", "created_by_id", "created_at", "updated_at", "version", "archived_at", "converted_at", "converted_person_id", "converted_company_id")


class LeadMoney(serializers.DecimalField):
    def to_internal_value(self, value):
        if isinstance(value, (float, bool)) or not str(value).isascii() or not str(value).isdigit():
            raise serializers.ValidationError("مبلغ باید تومان صحیح و بدون جداکننده باشد.")
        return super().to_internal_value(value)


class LeadSerializer(serializers.ModelSerializer):
    created_by_label = serializers.SerializerMethodField()
    def get_created_by_label(self, record):
        member = self.context.get("membership")
        return (record.created_by.get_full_name().strip() or record.created_by.get_username()) if member and (member.role in {"owner","admin"} or record.created_by_id == member.user_id) else "عضو سازمان"
    estimated_amount = LeadMoney(max_digits=18, decimal_places=0, min_value=0, required=False, allow_null=True)
    converted_opportunity_id = serializers.SerializerMethodField()

    def get_converted_opportunity_id(self, record):
        membership = self.context.get("membership")
        if membership and record.status == "converted":
            from sales.services import opportunities
            value = opportunities(membership).filter(source_lead=record).values_list("pk", flat=True).first()
            return str(value) if value else None
        return None
    owner_label = serializers.SerializerMethodField()
    converted_person_id = serializers.SerializerMethodField()
    converted_company_id = serializers.SerializerMethodField()

    def get_owner_label(self, record):
        return record.owner.user.get_full_name().strip() or record.owner.user.get_username()

    def result_id(self, record, model, field):
        membership = self.context.get("membership")
        value = getattr(record, field)
        return str(value) if value and membership and visible_records(model, membership).filter(pk=value).exists() else None

    def get_converted_person_id(self, record):
        return self.result_id(record, Person, "converted_person_id")

    def get_converted_company_id(self, record):
        return self.result_id(record, Company, "converted_company_id")

    def validate_status(self, value):
        if value == "converted":
            raise serializers.ValidationError("تبدیل فقط از مسیر بازبینی تبدیل انجام می‌شود.")
        return value

    class Meta:
        model = Lead
        fields = COMMON + ("created_by_label", "probability", "expected_close_date", "description", "priority", "estimated_amount", "title", "first_name", "last_name", "contact_title", "company_name", "source", "phones", "emails", "tags", "status", "rejection_reason", "notes", "converted_opportunity_id")
        read_only_fields = COMMON + ("converted_opportunity_id", "created_by_label")
        validators = []
