from django.urls import path

from .views import (CompanyArchive, CompanyDetail, CompanyList, CompanyPeople, CompanyRestore,
                    PersonArchive, PersonDetail, PersonList, PersonRestore, RelationDetail, RelationList, OwnerList,
                    PersonDuplicates, CompanyDuplicates, PersonImportPreview, CompanyImportPreview, PersonImport, CompanyImport)

from .merge import PersonMerge, PersonMergePreview, CompanyMerge, CompanyMergePreview
from .files import PersonAttachmentList, CompanyAttachmentList, PersonAttachmentDownload, CompanyAttachmentDownload, PersonExport, CompanyExport, PersonSpreadsheet, CompanySpreadsheet
from .timeline import PersonTimeline, CompanyTimeline

urlpatterns = [
    path("people/export/", PersonExport.as_view()),
    path("companies/export/", CompanyExport.as_view()),
    path("people/spreadsheet/", PersonSpreadsheet.as_view()),
    path("companies/spreadsheet/", CompanySpreadsheet.as_view()),
    path("people/<uuid:record_id>/attachments/", PersonAttachmentList.as_view()),
    path("companies/<uuid:record_id>/attachments/", CompanyAttachmentList.as_view()),
    path("people/<uuid:record_id>/attachments/<uuid:attachment_id>/download/", PersonAttachmentDownload.as_view()),
    path("companies/<uuid:record_id>/attachments/<uuid:attachment_id>/download/", CompanyAttachmentDownload.as_view()),
    path("people/<uuid:record_id>/timeline/", PersonTimeline.as_view()),
    path("companies/<uuid:record_id>/timeline/", CompanyTimeline.as_view()),
    path("people/<uuid:record_id>/merge-preview/", PersonMergePreview.as_view()),
    path("people/<uuid:record_id>/merge/", PersonMerge.as_view()),
    path("companies/<uuid:record_id>/merge-preview/", CompanyMergePreview.as_view()),
    path("companies/<uuid:record_id>/merge/", CompanyMerge.as_view()),
    path("owners/", OwnerList.as_view()),
    path("people/", PersonList.as_view()),
    path("people/duplicates/", PersonDuplicates.as_view()),
    path("people/import-preview/", PersonImportPreview.as_view()),
    path("people/import/", PersonImport.as_view()),
    path("people/<uuid:record_id>/", PersonDetail.as_view()),
    path("people/<uuid:record_id>/archive/", PersonArchive.as_view()),
    path("people/<uuid:record_id>/restore/", PersonRestore.as_view()),
    path("companies/", CompanyList.as_view()),
    path("companies/duplicates/", CompanyDuplicates.as_view()),
    path("companies/import-preview/", CompanyImportPreview.as_view()),
    path("companies/import/", CompanyImport.as_view()),
    path("companies/<uuid:record_id>/", CompanyDetail.as_view()),
    path("companies/<uuid:record_id>/archive/", CompanyArchive.as_view()),
    path("companies/<uuid:record_id>/restore/", CompanyRestore.as_view()),
    path("people/<uuid:record_id>/companies/", RelationList.as_view()),
    path("companies/<uuid:record_id>/people/", CompanyPeople.as_view()),
    path("people/<uuid:person_id>/companies/<uuid:company_id>/", RelationDetail.as_view()),
]
