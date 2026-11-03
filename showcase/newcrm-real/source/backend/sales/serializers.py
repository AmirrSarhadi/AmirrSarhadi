from rest_framework import serializers
from .models import Opportunity, OpportunityEvent, Pipeline, Stage


class StageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = ("id", "name", "position", "kind")


class PipelineSerializer(serializers.ModelSerializer):
    stages = StageSerializer(many=True, read_only=True)
    class Meta:
        model = Pipeline
        fields = ("id", "name", "version", "stages")


class OpportunitySerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=18, decimal_places=0, allow_null=True, read_only=True)
    source_lead_id = serializers.SerializerMethodField()
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    state = serializers.CharField(source="stage.kind", read_only=True)
    pipeline_id = serializers.UUIDField(source="stage.pipeline_id", read_only=True)
    pipeline_name = serializers.CharField(source="stage.pipeline.name", read_only=True)
    owner_label = serializers.SerializerMethodField()
    customer_label = serializers.SerializerMethodField()
    amount_unit = serializers.SerializerMethodField()

    def get_owner_label(self, record):
        return record.owner.user.get_full_name().strip() or record.owner.user.get_username()
    def get_customer_label(self, record):
        return f"{record.person.first_name} {record.person.last_name}".strip() if record.person_id else record.company.name
    def get_amount_unit(self, record):
        return "TOMAN"
    def get_source_lead_id(self, record):
        request = self.context.get("request")
        if request and record.source_lead_id:
            from customers.access import visible_records
            from leads.models import Lead
            if visible_records(Lead, request.membership, "lead.view").filter(pk=record.source_lead_id).exists():
                return str(record.source_lead_id)
        return None

    class Meta:
        model = Opportunity
        fields = ("id", "title", "organization_id", "owner_id", "owner_label", "version", "person_id", "company_id",
            "customer_label", "pipeline_id", "pipeline_name", "stage_id", "stage_name", "state", "amount", "amount_unit",
            "expected_close_date", "closed_at", "loss_reason", "created_at", "source_lead_id")


class EventSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=18, decimal_places=0, allow_null=True, read_only=True)
    amount_unit = serializers.SerializerMethodField()
    def get_amount_unit(self, record):
        return "TOMAN"
    class Meta:
        model = OpportunityEvent
        fields = ("id", "action", "version", "previous_stage_name", "stage_name", "stage_kind", "stage_id_snapshot",
                  "pipeline_id_snapshot", "pipeline_name", "stage_position", "amount", "amount_unit", "reason", "created_at")
