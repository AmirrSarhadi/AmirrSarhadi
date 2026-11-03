from django.urls import path
from .views import ActivityList, ActivityDetail, ActivityAction, ActivityHistory, NotificationList, NotificationRead, ActivityOwners
from .reference import ActivitySummary, ActivityExport, ActivitySpreadsheet, ActivityImportPreview, ActivityImport
urlpatterns = [
    path("summary/", ActivitySummary.as_view()),
    path("export/", ActivityExport.as_view()),
    path("spreadsheet/", ActivitySpreadsheet.as_view()),
    path("import-preview/", ActivityImportPreview.as_view()),
    path("import/", ActivityImport.as_view()),
    path("<uuid:record_id>/start/", ActivityAction.as_view(), {"action":"start"}),
    path("", ActivityList.as_view()),
    path("owners/", ActivityOwners.as_view()),
    path("notifications/", NotificationList.as_view()),
    path("notifications/<uuid:record_id>/read/", NotificationRead.as_view()),
    path("<uuid:record_id>/", ActivityDetail.as_view()),
    path("<uuid:record_id>/history/", ActivityHistory.as_view()),
    path("<uuid:record_id>/complete/", ActivityAction.as_view(), {"action": "complete"}),
    path("<uuid:record_id>/cancel/", ActivityAction.as_view(), {"action": "cancel"}),
    path("<uuid:record_id>/reopen/", ActivityAction.as_view(), {"action": "reopen"}),
]
