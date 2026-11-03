import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from customers.models import OwnedRecord
from customers.normalization import emails, phones, normalize_search, phone_search_values


class Lead(OwnedRecord):
    priority = models.CharField(max_length=8, choices=(("low", "پایین"), ("normal", "عادی"), ("high", "بالا")), default="normal")
    estimated_amount = models.BigIntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(999999999999999999)])
    probability = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    expected_close_date = models.DateField(null=True, blank=True)
    description = models.TextField(max_length=4000, blank=True)
    title = models.CharField(max_length=160)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    contact_title = models.CharField(max_length=160, blank=True)
    company_name = models.CharField(max_length=160, blank=True)
    source = models.CharField(max_length=160, blank=True)
    phones = models.JSONField(default=list, blank=True)
    emails = models.JSONField(default=list, blank=True)
    notes = models.TextField(max_length=2000, blank=True)
    status = models.CharField(max_length=16, default="new", choices=(("new", "جدید"), ("working", "در حال پیگیری"), ("qualified", "واجد شرایط"), ("proposal", "پیشنهاد ارسال‌شده"), ("rejected", "ردشده"), ("converted", "تبدیل‌شده")))
    rejection_reason = models.CharField(max_length=500, blank=True)
    converted_at = models.DateTimeField(null=True, blank=True, editable=False)
    converted_person = models.ForeignKey("customers.Person", on_delete=models.PROTECT, null=True, blank=True, editable=False)
    converted_company = models.ForeignKey("customers.Company", on_delete=models.PROTECT, null=True, blank=True, editable=False)

    class Meta(OwnedRecord.Meta):
        constraints = [models.CheckConstraint(condition=models.Q(probability__isnull=True) | models.Q(probability__gte=0, probability__lte=100), name="lead_probability_bound"), models.CheckConstraint(condition=models.Q(estimated_amount__isnull=True) | models.Q(estimated_amount__gte=0, estimated_amount__lte=999999999999999999), name="lead_estimate_bound"), models.UniqueConstraint(fields=("organization", "id"), name="lead_org_id"),
            models.CheckConstraint(condition=~models.Q(title=""), name="lead_has_title"),
            models.CheckConstraint(condition=~models.Q(status="rejected") | ~models.Q(rejection_reason=""), name="lead_rejection_reason"),
            models.CheckConstraint(condition=(models.Q(status="converted", converted_at__isnull=False) & (models.Q(converted_person__isnull=False) | models.Q(converted_company__isnull=False))) | (~models.Q(status="converted") & models.Q(converted_at__isnull=True, converted_person__isnull=True, converted_company__isnull=True)), name="lead_conversion_state")]
        indexes = [models.Index(fields=("organization", "owner", "archived_at"), name="lead_scope")]

    def clean(self):
        super().clean()
        self.title = self.title.strip()
        self.first_name, self.last_name = self.first_name.strip(), self.last_name.strip()
        self.rejection_reason = self.rejection_reason.strip()
        if not self.title:
            raise ValidationError({"title": "عنوان سرنخ را وارد کنید."})
        if self.status == "rejected" and not self.rejection_reason:
            raise ValidationError({"rejection_reason": "دلیل رد سرنخ را وارد کنید."})
        for field, normalizer in (("phones", phones), ("emails", emails)):
            try:
                setattr(self, field, normalizer(getattr(self, field)))
            except ValidationError as error:
                raise ValidationError({field: error.messages})
        for field in ("converted_person", "converted_company"):
            if getattr(self, field + "_id") and getattr(self, field).organization_id != self.organization_id:
                raise ValidationError({field: "پرونده تبدیل باید متعلق به همین سازمان باشد."})
        self.search_text = normalize_search(" ".join([self.title, self.first_name, self.last_name, self.company_name,
            self.contact_title, self.source, *self.tags, phone_search_values(self.phones), *self.emails]))


class LeadEvent(models.Model):
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    lead = models.ForeignKey(Lead, on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=32)
    version = models.PositiveIntegerField()
    changed_fields = models.JSONField(default=list)
    from_status = models.CharField(max_length=16, blank=True)
    to_status = models.CharField(max_length=16)
    rejection_reason = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ConversionReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    lead = models.OneToOneField(Lead, on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    request_digest = models.CharField(max_length=64)
    snapshot = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
