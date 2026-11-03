import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from customers.models import OwnedRecord
from customers.normalization import normalize_search


class Pipeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("name", "id")
        constraints = [models.UniqueConstraint(fields=("organization", "id"), name="sale_pipeline_org"),
                       models.UniqueConstraint(fields=("organization", "name"), name="sale_pipeline_name")]


class Stage(models.Model):
    class Kind(models.TextChoices):
        OPEN = "open", "باز"
        WON = "won", "برد"
        LOST = "lost", "باخت"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    pipeline = models.ForeignKey(Pipeline, on_delete=models.PROTECT, related_name="stages")
    name = models.CharField(max_length=160)
    position = models.PositiveIntegerField()
    kind = models.CharField(max_length=8, choices=Kind.choices)

    class Meta:
        ordering = ("position", "id")
        constraints = [models.UniqueConstraint(fields=("organization", "id"), name="sale_stage_org"),
            models.UniqueConstraint(fields=("pipeline", "position"), name="sale_stage_position"),
            models.UniqueConstraint(fields=("pipeline", "name"), name="sale_stage_name")]


class Opportunity(OwnedRecord):
    title = models.CharField(max_length=200)
    stage = models.ForeignKey(Stage, on_delete=models.PROTECT)
    person = models.ForeignKey("customers.Person", on_delete=models.PROTECT, null=True, blank=True)
    company = models.ForeignKey("customers.Company", on_delete=models.PROTECT, null=True, blank=True)
    amount = models.BigIntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(999999999999999999)])
    expected_close_date = models.DateField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    loss_reason = models.CharField(max_length=500, blank=True)
    source_lead = models.OneToOneField("leads.Lead", on_delete=models.PROTECT, null=True, blank=True)

    class Meta(OwnedRecord.Meta):
        constraints = [models.UniqueConstraint(fields=("organization", "id"), name="sale_opportunity_org"),
            models.CheckConstraint(condition=(models.Q(person__isnull=False, company__isnull=True) |
                models.Q(person__isnull=True, company__isnull=False)), name="sale_one_customer"),
            models.CheckConstraint(condition=models.Q(amount__isnull=True) | models.Q(amount__gte=0), name="sale_nonnegative_amount"),
            models.CheckConstraint(condition=models.Q(amount__isnull=True) | models.Q(amount__lte=999999999999999999), name="sale_amount_bound")]
        indexes = [models.Index(fields=("organization", "owner", "stage"), name="sale_opportunity_scope")]

    def clean(self):
        super().clean()
        self.title = self.title.strip()
        if not self.title:
            raise ValidationError({"title": "عنوان فرصت را وارد کنید."})
        for field in ("stage", "person", "company", "source_lead"):
            value = getattr(self, field) if getattr(self, field + "_id") else None
            if value and value.organization_id != self.organization_id:
                raise ValidationError({field: "مورد انتخاب‌شده باید متعلق به همین سازمان باشد."})
        if self.stage_id:
            if self.stage.kind == "won" and self.amount is None:
                raise ValidationError({"amount": "برای ثبت برد، مبلغ به تومان را مشخص کنید."})
            if self.stage.kind == "lost" and not self.loss_reason.strip():
                raise ValidationError({"loss_reason": "دلیل باخت لازم است."})
            if (self.stage.kind == "open") != (self.closed_at is None):
                raise ValidationError({"stage": "وضعیت بسته‌شدن با مرحله سازگار نیست."})
        self.search_text = normalize_search(self.title)


class OpportunityEvent(models.Model):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.PROTECT, related_name="history")
    organization = models.ForeignKey("tenancy.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=20)
    version = models.PositiveIntegerField()
    previous_stage_name = models.CharField(max_length=160, blank=True)
    stage_id_snapshot = models.UUIDField(null=True, blank=True)
    pipeline_id_snapshot = models.UUIDField(null=True, blank=True)
    pipeline_name = models.CharField(max_length=160, blank=True)
    stage_position = models.PositiveIntegerField(null=True, blank=True)
    stage_name = models.CharField(max_length=160)
    stage_kind = models.CharField(max_length=8)
    amount = models.BigIntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(999999999999999999)])
    reason = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        constraints = [models.CheckConstraint(condition=models.Q(amount__isnull=True) | models.Q(amount__gte=0, amount__lte=999999999999999999), name="sale_event_amount_bound")]


class SaleRecord(OwnedRecord):
    source_lead = models.ForeignKey('leads.Lead',null=True,blank=True,on_delete=models.PROTECT)
    number = models.CharField(max_length=40)
    sale_date = models.DateField()
    person = models.ForeignKey('customers.Person', null=True, blank=True, on_delete=models.PROTECT)
    company = models.ForeignKey('customers.Company', null=True, blank=True, on_delete=models.PROTECT)
    status = models.CharField(max_length=16, default='pending', choices=[('pending','در انتظار'),('confirmed','تأیید شده'),('delivered','تحویل شده'),('cancelled','لغو شده')])
    payment_status = models.CharField(max_length=16, default='unpaid', choices=[('unpaid','پرداخت نشده'),('partial','پرداخت بخشی'),('paid','پرداخت شده')])
    payment_method = models.CharField(max_length=16, blank=True, choices=[('','ثبت نشده'),('bank','انتقال بانکی'),('cash','نقدی'),('card','کارت')])
    notes = models.TextField(max_length=4000, blank=True)
    items = models.JSONField(default=list)
    tax = models.BigIntegerField(default=0)
    discount = models.BigIntegerField(default=0)
    shipping = models.BigIntegerField(default=0)
    subtotal = models.BigIntegerField(default=0, editable=False)
    total = models.BigIntegerField(default=0, editable=False)

    class Meta(OwnedRecord.Meta):
        constraints = [models.UniqueConstraint(fields=('organization','number'),name='order_number_org'),
            models.UniqueConstraint(fields=('organization','id'),name='order_id_org'),
            models.CheckConstraint(condition=(models.Q(person__isnull=False,company__isnull=True)|models.Q(person__isnull=True,company__isnull=False)),name='order_one_customer'),
            models.CheckConstraint(condition=models.Q(tax__gte=0,discount__gte=0,shipping__gte=0,subtotal__gte=0,total__gte=0,total__lte=999999999999999999),name='order_money_bounds')]

    @property
    def title(self): return self.number

    def clean(self):
        super().clean()
        from .orders import calculate
        self.items,self.subtotal,self.total=calculate(self.items,self.tax,self.discount,self.shipping)
        for field in ('person','company','source_lead'):
            record=getattr(self,field)
            if record and record.organization_id != self.organization_id: raise ValidationError({field:'مشتری باید متعلق به همین سازمان باشد.'})
        self.number=self.number.strip()
        self.search_text=normalize_search(self.number+' '+self.notes)


class SaleRecordEvent(models.Model):
    organization=models.ForeignKey('tenancy.Organization',on_delete=models.PROTECT)
    order=models.ForeignKey(SaleRecord,on_delete=models.PROTECT,related_name='history')
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    version=models.PositiveIntegerField()
    snapshot=models.JSONField()
    created_at=models.DateTimeField(auto_now_add=True)
