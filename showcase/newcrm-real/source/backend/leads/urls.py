from django.urls import path
from .views import LeadList, LeadDetail, LeadArchive, LeadRestore, LeadOwners

from .conversion import LeadConversion, LeadConversionPreview

from .reference import LeadSummary, LeadAttachmentList, LeadAttachmentDownload, LeadExport, LeadSpreadsheet, LeadImportPreview, LeadImport

urlpatterns = [path("summary/", LeadSummary.as_view()), path("export/", LeadExport.as_view()), path("spreadsheet/", LeadSpreadsheet.as_view()), path("import-preview/", LeadImportPreview.as_view()), path("import/", LeadImport.as_view()), path("<uuid:record_id>/attachments/", LeadAttachmentList.as_view()), path("<uuid:record_id>/attachments/<uuid:attachment_id>/download/", LeadAttachmentDownload.as_view()),path("<uuid:record_id>/convert-preview/", LeadConversionPreview.as_view()),
    path("<uuid:record_id>/convert/", LeadConversion.as_view()),path("", LeadList.as_view()), path("owners/", LeadOwners.as_view()),
    path("<uuid:record_id>/", LeadDetail.as_view()), path("<uuid:record_id>/archive/", LeadArchive.as_view()),
    path("<uuid:record_id>/restore/", LeadRestore.as_view())]
