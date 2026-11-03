import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import models, transaction
from django.db.models import Max

from .normalization import emails, normalize_search, phone_search_values, phones, text_list


class OwnedRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    owner = models.ForeignKey("tenancy.Membership", on_delete=models.PROTECT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.PositiveIntegerField(default=1, editable=False)
    archived_at = models.DateTimeField(null=True, blank=True, editable=False)
    tags = models.JSONField(default=list, blank=True)
    search_text = models.TextField(blank=True, editable=False)

    class Meta:
        abstract = True
        ordering = ("-created_at", "-id")

    def clean(self):
        super().clean()
        if self.owner_id and self.owner.organization_id != self.organization_id:
            raise ValidationError({"owner": "مسئول باید عضو همان سازمان باشد."})
        previous_org = type(self).objects.filter(pk=self.pk).values_list("organization_id", flat=True).first()
        if previous_org is not None and previous_org != self.organization_id:
            raise ValidationError({"organization": "انتقال سازمان پرونده مجاز نیست."})
        try:
            self.tags = text_list(self.tags, length=40)
        except ValidationError as error:
            raise ValidationError({"tags": error.messages})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class CustomerRecord(OwnedRecord):
    merged_into = models.ForeignKey("self", null=True, blank=True, editable=False, on_delete=models.PROTECT, related_name="merged_sources")

    class Meta(OwnedRecord.Meta):
        abstract = True

    def clean(self):
        super().clean()
        if self.merged_into_id and (self.merged_into_id == self.pk or self.merged_into.organization_id != self.organization_id):
            raise ValidationError({"merged_into": "پرونده اصلی باید متفاوت و در همین سازمان باشد."})


class Person(CustomerRecord):
    customer_number = models.PositiveBigIntegerField(null=True, blank=True, editable=False)
    customer_type = models.CharField(max_length=16, choices=(("individual", "حقیقی"), ("legal", "حقوقی")), default="individual")
    primary_company = models.ForeignKey("Company", on_delete=models.PROTECT, null=True, blank=True, related_name="primary_contacts")
    industry = models.CharField(max_length=120, blank=True)
    street = models.TextField(max_length=1000, blank=True)
    city = models.CharField(max_length=100, blank=True)
    province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=10, blank=True)
    website = models.URLField(max_length=500, blank=True, validators=[URLValidator(schemes=("http", "https"))])
    notes = models.TextField(max_length=4000, blank=True)

    def save(self, *args, **kwargs):
        if self._state.adding and self.customer_number is None:
            from tenancy.models import Organization
            with transaction.atomic():
                Organization.objects.select_for_update().get(pk=self.organization_id)
                self.customer_number = (type(self).objects.filter(organization_id=self.organization_id).aggregate(n=Max("customer_number"))["n"] or 0) + 1
                return super().save(*args, **kwargs)
        return super().save(*args, **kwargs)

    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    title = models.CharField(max_length=160, blank=True)
    source = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=16, choices=(("active", "فعال"), ("inactive", "غیرفعال"), ("potential", "مشتری بالقوه")), default="active")
    phones = models.JSONField(default=list, blank=True)
    emails = models.JSONField(default=list, blank=True)

    class Meta(CustomerRecord.Meta):
        constraints = [
            models.UniqueConstraint(fields=("organization", "id"), name="customer_person_org_id"),
            models.UniqueConstraint(fields=("organization", "customer_number"), name="customer_person_number"),
            models.CheckConstraint(condition=~(models.Q(first_name="") & models.Q(last_name="")), name="customer_person_has_name"),
        ]
        indexes = [models.Index(fields=("organization", "owner", "archived_at"), name="customer_person_scope")]

    def clean(self):
        super().clean()
        if self.primary_company_id and self.primary_company.organization_id != self.organization_id:
            raise ValidationError({"primary_company_id": "شرکت باید در همین سازمان باشد."})
        if self.customer_type == "legal" and not self.primary_company_id:
            raise ValidationError({"primary_company_id": "شرکت مرتبط با مشتری حقوقی را انتخاب کنید."})
        self.postal_code = normalize_search(self.postal_code).replace(" ", "")
        if self.postal_code and (not self.postal_code.isascii() or not self.postal_code.isdigit() or len(self.postal_code) != 10):
            raise ValidationError({"postal_code": "کد پستی باید ۱۰ رقم باشد."})
        self.first_name = self.first_name.strip()
        self.last_name = self.last_name.strip()
        if not self.first_name and not self.last_name:
            raise ValidationError({"first_name": "نام یا نام خانوادگی را وارد کنید."})
        for field, normalizer in (("phones", phones), ("emails", emails)):
            try:
                setattr(self, field, normalizer(getattr(self, field)))
            except ValidationError as error:
                raise ValidationError({field: error.messages})
        self.search_text = normalize_search(" ".join([
            self.first_name, self.last_name, self.title, self.source, self.city, self.province, self.street, self.industry, *self.tags,
            phone_search_values(self.phones), *self.emails,
        ]))


class Company(CustomerRecord):
    registration_number = models.CharField(max_length=80, blank=True)
    phones = models.JSONField(default=list, blank=True)
    emails = models.JSONField(default=list, blank=True)
    name = models.CharField(max_length=160)
    legal_name = models.CharField(max_length=200, blank=True)
    industry = models.CharField(max_length=120, blank=True)
    size = models.CharField(max_length=80, blank=True)
    website = models.URLField(max_length=500, blank=True, validators=[URLValidator(schemes=("http", "https"))])
    addresses = models.JSONField(default=list, blank=True)

    class Meta(CustomerRecord.Meta):
        constraints = [models.UniqueConstraint(fields=("organization", "id"), name="customer_company_org_id")]
        indexes = [models.Index(fields=("organization", "owner", "archived_at"), name="customer_company_scope")]

    def clean(self):
        super().clean()
        for field, normalizer in (("phones", phones), ("emails", emails)):
            try:
                setattr(self, field, normalizer(getattr(self, field)))
            except ValidationError as error:
                raise ValidationError({field: error.messages})
        self.name = self.name.strip()
        if not self.name:
            raise ValidationError({"name": "نام شرکت را وارد کنید."})
        try:
            self.addresses = text_list(self.addresses, limit=10, length=500)
        except ValidationError as error:
            raise ValidationError({"addresses": error.messages})
        self.search_text = normalize_search(" ".join([
            self.name, self.legal_name, self.registration_number, phone_search_values(self.phones), *self.emails, self.industry, self.size, self.website, *self.tags, *self.addresses,
        ]))


class PersonCompany(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    person = models.ForeignKey(Person, on_delete=models.PROTECT, related_name="company_links")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="person_links")
    title = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("person", "company"), name="customer_unique_person_company")]
        ordering = ("created_at", "id")

    def clean(self):
        super().clean()
        if self.person_id and self.person.organization_id != self.organization_id:
            raise ValidationError({"person": "شخص باید متعلق به همان سازمان باشد."})
        if self.company_id and self.company.organization_id != self.organization_id:
            raise ValidationError({"company": "شرکت باید متعلق به همان سازمان باشد."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class CustomerEvent(models.Model):
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    entity_type = models.CharField(max_length=24)
    target_id = models.UUIDField()
    related_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=40)
    version = models.PositiveIntegerField()
    changed_fields = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [models.Index(fields=("organization", "target_id", "created_at"), name="customer_event_target"),
                   models.Index(fields=("organization", "related_id", "created_at"), name="customer_event_related")]


class CreationReceipt(models.Model):
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    key = models.UUIDField()
    entity_type = models.CharField(max_length=24)
    request_digest = models.CharField(max_length=64)
    target_id = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("organization", "actor", "entity_type", "key"), name="customer_creation_receipt")]


class ImportReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    entity_type = models.CharField(max_length=24)
    content_digest = models.CharField(max_length=64)
    results = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("organization", "actor", "entity_type", "content_digest"), name="customer_import_once")]


class MergeReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    entity_type = models.CharField(max_length=24)
    source_id = models.UUIDField()
    target_id = models.UUIDField()
    request_digest = models.CharField(max_length=64)
    snapshot = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("organization", "entity_type", "source_id"), name="customer_merge_source_once")]


def attachment_path(instance, filename):
    return f"customer-files/{instance.organization_id}/{instance.id.hex}"


class CustomerAttachment(models.Model):
    lead = models.ForeignKey("leads.Lead", on_delete=models.PROTECT, null=True, blank=True)
    salerecord = models.ForeignKey("sales.SaleRecord", on_delete=models.PROTECT, null=True, blank=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    person = models.ForeignKey(Person, on_delete=models.PROTECT, null=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    key = models.UUIDField()
    digest = models.CharField(max_length=64)
    original_name = models.CharField(max_length=200)
    size = models.PositiveIntegerField()
    file = models.FileField(upload_to=attachment_path)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        constraints = [models.UniqueConstraint(fields=("organization", "uploaded_by", "key"), name="customer_attachment_once"),
            models.CheckConstraint(condition=(models.Q(person__isnull=False, company__isnull=True, lead__isnull=True,salerecord__isnull=True) | models.Q(person__isnull=True, company__isnull=False, lead__isnull=True,salerecord__isnull=True) | models.Q(person__isnull=True, company__isnull=True, lead__isnull=False,salerecord__isnull=True) | models.Q(person__isnull=True,company__isnull=True,lead__isnull=True,salerecord__isnull=False)), name="customer_file_one_target")]
