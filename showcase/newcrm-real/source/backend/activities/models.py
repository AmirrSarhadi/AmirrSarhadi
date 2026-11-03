import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone
from customers.models import OwnedRecord
from customers.normalization import normalize_search


ACTIVE = ("planned", "in_progress")

class Activity(OwnedRecord):
    priority = models.CharField(max_length=8, choices=(("low","پایین"),("normal","عادی"),("high","بالا")), default="normal")
    progress = models.PositiveSmallIntegerField(null=True,blank=True,validators=[MinValueValidator(0),MaxValueValidator(100)])
    started_at = models.DateTimeField(null=True,blank=True,editable=False)

    @property
    def target_type(self): return next((kind for kind in ("person","company","lead","opportunity") if getattr(self,kind+"_id")),"none")
    @property
    def target_id(self): return getattr(self,self.target_type+"_id") if self.target_type!="none" else None

    title = models.CharField(max_length=200)
    kind = models.CharField(max_length=16, choices=(("call", "تماس"), ("meeting", "جلسه"), ("task", "کار")))
    notes = models.TextField(max_length=4000, blank=True)
    status = models.CharField(max_length=16, default="planned", choices=(("planned", "برنامه‌ریزی‌شده"), ("in_progress", "در حال انجام"), ("done", "انجام‌شده"), ("cancelled", "لغوشده")))
    due_at = models.DateTimeField()
    remind_at = models.DateTimeField(null=True, blank=True)
    reminder_revision = models.PositiveIntegerField(default=1, editable=False)
    completed_at = models.DateTimeField(null=True, blank=True, editable=False)
    outcome = models.CharField(max_length=1000, blank=True)
    cancellation_reason = models.CharField(max_length=500, blank=True)
    person = models.ForeignKey("customers.Person", on_delete=models.PROTECT, null=True, blank=True)
    company = models.ForeignKey("customers.Company", on_delete=models.PROTECT, null=True, blank=True)
    lead = models.ForeignKey("leads.Lead", on_delete=models.PROTECT, null=True, blank=True)
    opportunity = models.ForeignKey("sales.Opportunity", on_delete=models.PROTECT, null=True, blank=True)

    class Meta(OwnedRecord.Meta):
        ordering = ("due_at", "id")
        constraints = [models.CheckConstraint(condition=models.Q(progress__isnull=True)|models.Q(progress__gte=0,progress__lte=100),name="activity_progress_bound"), models.UniqueConstraint(fields=("organization", "id"), name="activity_org_id"),
            models.CheckConstraint(condition=(
                models.Q(kind="task",person__isnull=True,company__isnull=True,lead__isnull=True,opportunity__isnull=True) |
                models.Q(person__isnull=False, company__isnull=True, lead__isnull=True, opportunity__isnull=True) |
                models.Q(person__isnull=True, company__isnull=False, lead__isnull=True, opportunity__isnull=True) |
                models.Q(person__isnull=True, company__isnull=True, lead__isnull=False, opportunity__isnull=True) |
                models.Q(person__isnull=True, company__isnull=True, lead__isnull=True, opportunity__isnull=False)), name="activity_one_target"),
            models.CheckConstraint(condition=models.Q(remind_at__isnull=True) | models.Q(remind_at__lte=models.F("due_at")), name="activity_reminder_before_due"),
            models.CheckConstraint(condition=(models.Q(status="done", completed_at__isnull=False) |
                (models.Q(status__in=("planned", "in_progress", "cancelled")) & models.Q(completed_at__isnull=True))), name="activity_completion_state"),
            models.CheckConstraint(condition=~models.Q(status="cancelled") | ~models.Q(cancellation_reason=""), name="activity_cancel_reason")]
        indexes = [models.Index(fields=("organization", "owner", "status", "due_at"), name="activity_owner_due")]

    def clean(self):
        super().clean()
        self.title = self.title.strip()
        if not self.title:
            raise ValidationError({"title": "عنوان فعالیت را وارد کنید."})
        for field in ("person", "company", "lead", "opportunity"):
            record = getattr(self, field) if getattr(self, field + "_id") else None
            if record and record.organization_id != self.organization_id:
                raise ValidationError({"target_id": "پرونده باید متعلق به همین سازمان باشد."})
        if self.remind_at and self.due_at and self.remind_at > self.due_at:
            raise ValidationError({"remind_at": "زمان یادآوری باید برابر یا پیش از موعد باشد."})
        self.search_text = normalize_search(self.title+" "+self.notes)


class ActivityEvent(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.PROTECT, related_name="history")
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=24)
    version = models.PositiveIntegerField()
    status = models.CharField(max_length=16)
    due_at = models.DateTimeField()
    remind_at = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")


class ReminderJob(models.Model):
    """Transactional database outbox; source of truth for in-app delivery only."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    activity = models.ForeignKey(Activity, on_delete=models.PROTECT, related_name="reminder_jobs")
    recipient = models.ForeignKey("tenancy.Membership", on_delete=models.PROTECT)
    revision = models.PositiveIntegerField()
    scheduled_at = models.DateTimeField()
    available_at = models.DateTimeField()
    status = models.CharField(max_length=16, default="pending", choices=(("pending", "در انتظار"), ("sent", "ثبت‌شده"), ("cancelled", "باطل‌شده"), ("failed", "ناموفق")))
    attempts = models.PositiveSmallIntegerField(default=0)
    error_code = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("activity", "revision"), name="activity_reminder_generation")]
        indexes = [models.Index(fields=("status", "available_at"), name="activity_reminder_queue")]


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    activity = models.ForeignKey(Activity, on_delete=models.PROTECT)
    recipient = models.ForeignKey("tenancy.Membership", on_delete=models.PROTECT)
    revision = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at", "-id")
        constraints = [models.UniqueConstraint(fields=("activity", "revision"), name="activity_notification_once")]
