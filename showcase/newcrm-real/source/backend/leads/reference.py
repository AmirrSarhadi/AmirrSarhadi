"""Reference workspace reads and shared private file/import adapters."""
from django.db.models import Count, Q
from rest_framework.response import Response
from customers.files import AttachmentList, AttachmentDownload, CustomerExport, SpreadsheetConvert
from customers.views import CustomerImportPreview, CustomerImport
from .views import LeadView, event, filtered_records
from .serializers import LeadSerializer


class LeadSummary(LeadView):
    operations = {'GET':'lead.view'}
    def get(self, request):
        records=self.records(request).filter(archived_at__isnull=True)
        values=records.aggregate(total=Count('pk'), **{status:Count('pk',filter=Q(status=status)) for status in ('new','working','qualified','proposal','converted','rejected')})
        values['sources']=list(records.exclude(source='').order_by('source').values_list('source',flat=True).distinct()[:50])
        return Response(values)


class LeadAttachmentList(AttachmentList, LeadView):
    operations={'GET':'lead.view','POST':'lead.update'}
    write_operation='lead.update'
    immutable_message='لید بایگانی‌شده یا تبدیل‌شده فقط‌خواندنی است؛ پیوست جدید بارگذاری نمی‌شود.'
    def immutable(self, record): return bool(record.archived_at or record.status=='converted')
    def audit(self, request, record): event(request,record,'attachment_added',['attachments'],record.status)


class LeadAttachmentDownload(AttachmentDownload, LeadView):
    operations={'GET':'lead.view'}


class LeadExport(CustomerExport, LeadView):
    operations={'GET':'lead.export'}
    export_serializer=LeadSerializer
    def records(self, request, lock=False): return filtered_records(LeadView.records(self,request,lock),request)


class LeadSpreadsheet(SpreadsheetConvert, LeadView):
    operations={'POST':'lead.create'}


class LeadImportPreview(CustomerImportPreview, LeadView):
    operations={'POST':'lead.create'}


class LeadImport(CustomerImport, LeadView):
    operations={'POST':'lead.create'}
    write_operation='lead.create'
    def audit(self, request, record, changed, receipt): event(request,record,'created',changed)
