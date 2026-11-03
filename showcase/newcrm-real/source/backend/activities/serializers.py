import re
from django.utils import timezone
from rest_framework import serializers
from .models import Activity, ActivityEvent, Notification, ACTIVE


class AwareDateTime(serializers.DateTimeField):
    def to_internal_value(self, value):
        if not isinstance(value, str) or not re.search(r"(?:Z|[+-]\d{2}:\d{2})$", value):
            raise serializers.ValidationError("زمان باید دارای منطقه زمانی صریح باشد.")
        return super().to_internal_value(value)


class ActivityInput(serializers.Serializer):
    priority = serializers.ChoiceField(choices=("low","normal","high"),required=False)
    progress = serializers.IntegerField(min_value=0,max_value=100,required=False,allow_null=True)
    status = serializers.ChoiceField(choices=ACTIVE,required=False)
    title = serializers.CharField(max_length=200)
    kind = serializers.ChoiceField(choices=("call", "meeting", "task"))
    notes = serializers.CharField(max_length=4000, required=False, allow_blank=True)
    due_at = AwareDateTime()
    remind_at = AwareDateTime(required=False, allow_null=True)
    owner_id = serializers.IntegerField(min_value=1, required=False)
    target_type = serializers.ChoiceField(choices=("none", "person", "company", "lead", "opportunity"), required=False)
    target_id = serializers.UUIDField(required=False, allow_null=True)


class ActivitySerializer(serializers.ModelSerializer):
    owner_label = serializers.SerializerMethodField()
    target_type = serializers.SerializerMethodField()
    target_id = serializers.SerializerMethodField()
    target_label = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()
    reminder_state = serializers.SerializerMethodField()
    def get_owner_label(self, record):
        return record.owner.user.get_full_name().strip() or record.owner.user.get_username()
    def get_target_type(self, record):
        return record.target_type
    def get_target_id(self, record):
        return str(record.target_id) if record.target_id else None
    def get_target_label(self, record):
        kind = self.get_target_type(record)
        if kind=="none": return "بدون ارتباط"
        target = getattr(record, kind)
        return f"{target.first_name} {target.last_name}".strip() if kind == "person" else target.name if kind == "company" else target.title
    def get_overdue(self, record):
        return record.status in ACTIVE and record.due_at < timezone.now()
    def get_reminder_state(self, record):
        if hasattr(record,"current_reminder_state"): return record.current_reminder_state
        return record.reminder_jobs.filter(revision=record.reminder_revision).values_list("status", flat=True).first()
    class Meta:
        model = Activity
        fields = ("id", "organization_id", "owner_id", "owner_label", "version", "title", "kind", "notes", "status",
                  "priority", "progress", "started_at", "updated_at", "due_at", "remind_at", "completed_at", "outcome", "cancellation_reason", "target_type", "target_id",
                  "target_label", "overdue", "reminder_state", "created_at")


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityEvent
        fields = ("id", "action", "version", "status", "due_at", "remind_at", "reason", "created_at")


class NotificationSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="activity.title", read_only=True)
    due_at = serializers.DateTimeField(source="activity.due_at", read_only=True)
    kind = serializers.CharField(source="activity.kind", read_only=True)
    class Meta:
        model = Notification
        fields = ("id", "activity_id", "title", "kind", "due_at", "created_at", "read_at")


class ActivityFileSerializer(ActivityInput):
    def get_fields(self):
        fields=super().get_fields();fields.pop("owner_id",None);return fields
