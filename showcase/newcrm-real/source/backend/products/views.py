import json
import uuid
import re
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from customers.models import CreationReceipt
from customers.import_confirmation import digest
from customers.normalization import search_query
from customers.views import CustomerView,Conflict,paginate,strict_body,check_version,validate_record,CustomerImport,CustomerImportPreview
from customers.files import CustomerExport,SpreadsheetConvert
from tenancy.record_access import visible_records,lock_context
from sales.services import TomanField
from .models import Product,ProductEvent,ProductSaleLine,UNITS

class Quantity(serializers.DecimalField):
    def __init__(self,**kwargs):super().__init__(max_digits=15,decimal_places=3,min_value=0,**kwargs)
    def to_internal_value(self,value):
        if isinstance(value,(bool,float)):raise serializers.ValidationError('عدد اعشاری را به صورت رشته ارسال کنید.')
        return super().to_internal_value(value)
class ProductInput(serializers.Serializer):
    name=serializers.CharField(max_length=200)
    sku=serializers.CharField(max_length=80)
    description=serializers.CharField(max_length=4000,allow_blank=True,required=False)
    category=serializers.CharField(max_length=100,allow_blank=True,required=False)
    unit=serializers.ChoiceField(choices=UNITS,required=False)
    status=serializers.ChoiceField(choices=('active','inactive'),required=False)
    price=TomanField()
    cost=TomanField()
    stock=Quantity(required=False)
    min_stock=Quantity(required=False)
    barcode=serializers.CharField(max_length=100,allow_blank=True,required=False)
    weight_grams=Quantity(required=False,allow_null=True)
    dimensions=serializers.CharField(max_length=200,allow_blank=True,required=False)
    internal_notes=serializers.CharField(max_length=4000,allow_blank=True,required=False)
    tags=serializers.ListField(child=serializers.CharField(max_length=40),max_length=50,required=False)
    def validate(self,data):
        if not self.partial and data.get('price') is None:raise serializers.ValidationError({'price':['قیمت فروش لازم است؛ صفر مجاز است.']})
        if 'price' in data and data['price'] is None:raise serializers.ValidationError({'price':['قیمت فروش لازم است.']})
        if data.get('barcode') and not re.fullmatch(r'[ -~]{1,100}',data['barcode']):raise serializers.ValidationError({'barcode':['برای بارکد Code128 فقط نویسه‌های قابل چاپ لاتین وارد کنید.']})
        if 'sku' in data:data['sku']=data['sku'].strip().upper()
        return data
class ProductSerializer(serializers.ModelSerializer):
    price=serializers.CharField();cost=serializers.CharField(allow_null=True)
    low_stock=serializers.SerializerMethodField()
    creator_label=serializers.SerializerMethodField()
    def get_low_stock(self,r):return r.stock<r.min_stock
    def get_creator_label(self,r):return r.created_by.get_full_name() or r.created_by.get_username()
    class Meta:
        model=Product
        fields=('id','version','name','sku','description','category','unit','status','price','cost','stock','min_stock','barcode','weight_grams','dimensions','internal_notes','tags','created_at','updated_at','archived_at','low_stock','creator_label')

def records(member):return visible_records(Product,member,'product.view').select_related('created_by')
def filtered(request):
    qs=records(request.membership)
    archived=request.query_params.get('archived','active')
    if archived not in ('active','only','all'):raise serializers.ValidationError({'archived':['فیلتر معتبر نیست.']})
    if archived!='all':qs=qs.filter(archived_at__isnull=archived=='active')
    for key in ('status','category'):
        value=request.query_params.get(key,'')
        if value:
            if key=='status' and value not in ('active','inactive'):raise serializers.ValidationError({'status':['وضعیت معتبر نیست.']})
            if len(value)>100:raise serializers.ValidationError({key:['حداکثر ۱۰۰ نویسه مجاز است.']})
            qs=qs.filter(**{key:value})
    q=request.query_params.get('q','')
    if len(q)>100:raise serializers.ValidationError({'q':['حداکثر ۱۰۰ نویسه مجاز است.']})
    if q:qs=qs.filter(search_text__contains=search_query(q))
    return qs

def candidate(request,data,existing=None):
    s=ProductInput(data=data);s.is_valid(raise_exception=True);values=s.validated_data
    if Product.objects.filter(organization=request.organization,sku=values['sku']).exclude(pk=existing.pk if existing else None).exists():raise serializers.ValidationError({'sku':['این کد محصول قبلاً ثبت شده است.']})
    r=Product(organization=request.organization,owner=request.membership,created_by=request.user,**values)
    if existing:r.pk=existing.pk;r.owner=existing.owner;r.created_by=existing.created_by;r._state.adding=False;r._state.db=existing._state.db
    validate_record(r);return r

def event(request,r,action):ProductEvent.objects.create(organization=request.organization,product=r,actor=request.user,version=r.version,action=action,snapshot=json.loads(json.dumps(dict(ProductSerializer(r).data),default=str)))
class ProductScope(CustomerView):
    model=Product
    serializer_class=ProductInput
    def records(self,request):return records(request.membership)
    def candidate(self,request,data):return candidate(request,data)
class ProductList(ProductScope):
    operations={'GET':'product.view','POST':'product.create'}
    def get(self,request):return paginate(request,filtered(request),lambda r:ProductSerializer(r).data)
    def post(self,request):
        strict_body(request.data,set(ProductInput().fields));key=serializers.UUIDField().run_validation(request.headers.get('Idempotency-Key'))
        with transaction.atomic():
            lock_context(request,'product.create');proof=digest(request.data)
            receipt=CreationReceipt.objects.filter(organization=request.organization,actor=request.user,entity_type='product',key=key).first()
            if receipt:
                if receipt.request_digest!=proof:raise Conflict()
                return Response(ProductSerializer(get_object_or_404(self.records(request),pk=receipt.target_id)).data)
            r=candidate(request,request.data);r.save();event(request,r,'created')
            CreationReceipt.objects.create(organization=request.organization,actor=request.user,entity_type='product',key=key,request_digest=proof,target_id=r.pk)
        return Response(ProductSerializer(r).data,status=201)
class ProductDetail(ProductScope):
    operations={'GET':'product.view','PATCH':'product.update'}
    def get(self,request,record_id):return Response(ProductSerializer(get_object_or_404(self.records(request),pk=record_id)).data)
    def patch(self,request,record_id):
        strict_body(request.data,{'version',*ProductInput().fields})
        with transaction.atomic():
            lock_context(request,'product.update');r=get_object_or_404(self.records(request).select_for_update(of=('self',)),pk=record_id)
            check_version(r,serializers.IntegerField(min_value=1).run_validation(request.data.get('version')))
            if r.archived_at:raise Conflict('محصول بایگانی‌شده فقط‌خواندنی است.')
            data={k:v for k,v in ProductSerializer(r).data.items() if k in ProductInput().fields};data.update({k:v for k,v in request.data.items() if k!='version'})
            replacement=candidate(request,data,r)
            for key in ProductInput().fields:setattr(r,key,getattr(replacement,key))
            r.version+=1;r.save();event(request,r,'updated')
        return Response(ProductSerializer(r).data)
class ProductArchive(ProductScope):
    operations={'POST':'product.archive'}
    restore=False
    def post(self,request,record_id):
        strict_body(request.data,{'version'})
        with transaction.atomic():
            lock_context(request,'product.archive');r=get_object_or_404(self.records(request).select_for_update(of=('self',)),pk=record_id)
            check_version(r,serializers.IntegerField(min_value=1).run_validation(request.data.get('version')))
            if (r.archived_at is not None)==self.restore:
                r.archived_at=None if self.restore else timezone.now();r.version+=1;r.save();event(request,r,'restored' if self.restore else 'archived')
        return Response(ProductSerializer(r).data)
class ProductRestore(ProductArchive):restore=True
class ProductCategories(ProductScope):
    operations={'GET':'product.view'}
    def get(self,request):return Response(list(self.records(request).filter(archived_at__isnull=True).exclude(category='').order_by('category').values_list('category',flat=True).distinct()[:200]))
class ProductExport(ProductScope,CustomerExport):
    operations={'GET':'product.export'}
    export_serializer=ProductInput
    def export_records(self,request):return filtered(request)
    def get(self,request):return CustomerExport.get(self,request)
class ProductSpreadsheet(ProductScope,SpreadsheetConvert):
    operations={'POST':'product.create'}
    def post(self,request):return SpreadsheetConvert.post(self,request)
class ProductPreview(ProductScope,CustomerImportPreview):
    operations={'POST':'product.create'}
    def post(self,request):return CustomerImportPreview.post(self,request)
class ProductImport(ProductScope,CustomerImport):
    operations={'POST':'product.create'}
    write_operation='product.create'
    def audit(self,request,r,changed,receipt):event(request,r,'created')
    def post(self,request):return CustomerImport.post(self,request)

class ProductSales(ProductScope):
    operations={'GET':'product.view'}
    def get(self,request,record_id):
        from sales.orders import orders
        r=get_object_or_404(self.records(request),pk=record_id)
        qs=ProductSaleLine.objects.filter(organization=request.organization,product=r,order__in=orders(request.membership).exclude(status='cancelled')).select_related('order__person','order__company').order_by('-order__sale_date','-order_id','position')
        quantity=Decimal(0);total=0;latest=None
        for oid,q,t,date in qs.values_list('order_id','quantity','total','order__sale_date').iterator(chunk_size=1000):quantity+=q;total+=t;latest=date if latest is None or date>latest else latest
        response=paginate(request,qs,lambda line:{'id':line.pk,'order_id':str(line.order_id),'number':line.order.number,'quantity':str(line.quantity),'unit_price':str(line.unit_price),'total':str(line.total),'date':line.order.sale_date,'status':line.order.status,'customer_label':(line.order.person.first_name+' '+line.order.person.last_name).strip() if line.order.person_id else line.order.company.name})
        response.data['summary']={'orders':qs.order_by().values('order_id').distinct().count(),'quantity':str(quantity),'total':str(total),'last_sale_date':latest}
        return response


class ProductBarcode(ProductScope):
    operations={'GET':'product.view'}
    def get(self,request,record_id):
        from django.http import HttpResponse
        from reportlab.graphics.barcode import createBarcodeDrawing
        r=get_object_or_404(self.records(request),pk=record_id)
        if not r.barcode:raise serializers.ValidationError({'barcode':['بارکد ثبت نشده است.']})
        response=HttpResponse(createBarcodeDrawing('Code128',value=r.barcode,humanReadable=True,barHeight=45,barWidth=1).asString('svg'),content_type='image/svg+xml')
        response['Cache-Control']='private, no-store';response['X-Content-Type-Options']='nosniff';response['Content-Security-Policy']="default-src 'none'; style-src 'unsafe-inline'"
        return response
