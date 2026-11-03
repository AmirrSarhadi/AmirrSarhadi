from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator,MaxValueValidator
from django.db import models
from customers.models import OwnedRecord
from customers.normalization import normalize_search

LIMIT=999999999999999999
UNITS=('عدد','کیلوگرم','گرم','متر','لیتر','بسته','لیسانس','ساعت','قرارداد','دوره')
class Product(OwnedRecord):
    name=models.CharField(max_length=200)
    sku=models.CharField(max_length=80)
    description=models.TextField(max_length=4000,blank=True)
    category=models.CharField(max_length=100,blank=True)
    unit=models.CharField(max_length=20,choices=[(x,x) for x in UNITS],default='عدد')
    status=models.CharField(max_length=10,choices=[('active','فعال'),('inactive','غیرفعال')],default='active')
    price=models.BigIntegerField(validators=[MinValueValidator(0),MaxValueValidator(LIMIT)])
    cost=models.BigIntegerField(null=True,blank=True,validators=[MinValueValidator(0),MaxValueValidator(LIMIT)])
    stock=models.DecimalField(max_digits=15,decimal_places=3,default=0,validators=[MinValueValidator(0)])
    min_stock=models.DecimalField(max_digits=15,decimal_places=3,default=5,validators=[MinValueValidator(0)])
    barcode=models.CharField(max_length=100,blank=True)
    weight_grams=models.DecimalField(max_digits=15,decimal_places=3,null=True,blank=True,validators=[MinValueValidator(0)])
    dimensions=models.CharField(max_length=200,blank=True)
    internal_notes=models.TextField(max_length=4000,blank=True)
    class Meta(OwnedRecord.Meta):
        constraints=[models.UniqueConstraint(fields=('organization','id'),name='product_org_id'),models.UniqueConstraint(fields=('organization','sku'),name='product_sku_org'),models.CheckConstraint(condition=models.Q(price__gte=0,price__lte=LIMIT)&(models.Q(cost__isnull=True)|models.Q(cost__gte=0,cost__lte=LIMIT)),name='product_money_bounds'),models.CheckConstraint(condition=models.Q(stock__gte=0,min_stock__gte=0)&(models.Q(weight_grams__isnull=True)|models.Q(weight_grams__gte=0)),name='product_quantity_bounds')]
    @property
    def title(self): return self.name
    def clean(self):
        super().clean()
        self.name=self.name.strip();self.sku=self.sku.strip().upper();self.category=self.category.strip()
        if any(ord(ch)<32 or ord(ch)>126 for ch in self.barcode):raise ValidationError({'barcode':'بارکد Code128 باید از نویسه‌های قابل چاپ لاتین باشد.'})
        if not self.name: raise ValidationError({'name':'نام محصول لازم است.'})
        if not self.sku: raise ValidationError({'sku':'کد محصول لازم است.'})
        self.search_text=normalize_search(' '.join([self.name,self.sku,self.description,self.category,self.barcode,*self.tags]))

class ProductEvent(models.Model):
    organization=models.ForeignKey('tenancy.Organization',on_delete=models.PROTECT)
    product=models.ForeignKey(Product,on_delete=models.PROTECT,related_name='history')
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    version=models.PositiveIntegerField()
    action=models.CharField(max_length=20)
    snapshot=models.JSONField()
    created_at=models.DateTimeField(auto_now_add=True)

class ProductSaleLine(models.Model):
    organization=models.ForeignKey('tenancy.Organization',on_delete=models.PROTECT)
    product=models.ForeignKey(Product,on_delete=models.PROTECT,related_name='sale_lines')
    order=models.ForeignKey('sales.SaleRecord',on_delete=models.CASCADE,related_name='product_lines')
    position=models.PositiveIntegerField()
    quantity=models.DecimalField(max_digits=9,decimal_places=2)
    unit_price=models.BigIntegerField()
    total=models.BigIntegerField()
    class Meta:
        constraints=[models.UniqueConstraint(fields=('order','position'),name='product_order_position'),models.CheckConstraint(condition=models.Q(quantity__gt=0,unit_price__gte=0,total__gte=0),name='product_sale_nonnegative')]
