from django.urls import path
from .workspace_dashboard import WorkspaceDashboard, DashboardEvents
from .dashboard import Dashboard, PipelineSummary
from .views import PipelineList, PipelineDetail, OpportunityList, OpportunityDetail, OpportunityMove, OpportunityReopen, OpportunityHistory
from .orders import OrderList, OrderDetail, OrderSummary, OrderExport, OrderSpreadsheet, OrderImportPreview, OrderImport, OrderAttachmentList, OrderAttachmentDownload
from .order_pdf import OrderPDF
from .reports import Reports,ReportExport
urlpatterns = [
    path("reports/",Reports.as_view()),
    path("reports/export/",ReportExport.as_view()),
    path("orders/<uuid:record_id>/pdf/",OrderPDF.as_view()),
    path("orders/",OrderList.as_view()),
    path("orders/export/",OrderExport.as_view()),
    path("orders/spreadsheet/",OrderSpreadsheet.as_view()),
    path("orders/import-preview/",OrderImportPreview.as_view()),
    path("orders/import/",OrderImport.as_view()),
    path("orders/<uuid:record_id>/attachments/",OrderAttachmentList.as_view()),
    path("orders/<uuid:record_id>/attachments/<uuid:attachment_id>/download/",OrderAttachmentDownload.as_view()),
    path("orders/summary/",OrderSummary.as_view()),
    path("orders/<uuid:record_id>/",OrderDetail.as_view()),
    path("dashboard/workspace/", WorkspaceDashboard.as_view()),
    path("dashboard/events/", DashboardEvents.as_view()),
    path("dashboard/", Dashboard.as_view()),
    path("pipelines/<uuid:record_id>/summary/", PipelineSummary.as_view()),
    path("pipelines/", PipelineList.as_view()),
    path("pipelines/<uuid:record_id>/", PipelineDetail.as_view()),
    path("opportunities/", OpportunityList.as_view()),
    path("opportunities/<uuid:record_id>/", OpportunityDetail.as_view()),
    path("opportunities/<uuid:record_id>/move/", OpportunityMove.as_view()),
    path("opportunities/<uuid:record_id>/reopen/", OpportunityReopen.as_view()),
    path("opportunities/<uuid:record_id>/history/", OpportunityHistory.as_view()),
]
