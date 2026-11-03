"""Scoped task metrics and bounded, confirmed spreadsheet workflows."""
from django.db.models import Count, Q
from django.utils import timezone
from django.http import Http404
from rest_framework import serializers
from rest_framework.response import Response
from customers.files import CustomerExport, SpreadsheetConvert
from customers.views import CustomerImportPreview, CustomerImport
from .models import Activity, ACTIVE
from .serializers import ActivityFileSerializer
from .services import activities, candidate, schedule, emit
from .views import ActivityView, filtered_activities

class ActivitySummary(ActivityView):
    operations={"GET":"activity.view"}
    def get(self,request):
        return Response(activities(request.membership).aggregate(total=Count("pk"),
            planned=Count("pk",filter=Q(status="planned")),
            in_progress=Count("pk",filter=Q(status="in_progress")),
            done=Count("pk",filter=Q(status="done")),
            overdue=Count("pk",filter=Q(status__in=ACTIVE,due_at__lt=timezone.now()))))

class FileScope:
    model=Activity
    serializer_class=ActivityFileSerializer
    def records(self,request): return activities(request.membership)
    def candidate(self,request,data):
        serializer=self.serializer_class(data=data);serializer.is_valid(raise_exception=True)
        try: return candidate(request,serializer.validated_data)
        except Http404: raise serializers.ValidationError({"target_id":["پروندهٔ مرتبط در دسترس نیست."]})

class ActivityExport(FileScope,CustomerExport):
    operations={"GET":"activity.export"}
    export_serializer=ActivityFileSerializer
    def export_records(self,request): return filtered_activities(self.records(request),request)

class ActivitySpreadsheet(FileScope,SpreadsheetConvert):
    operations={"POST":"activity.create"}

class ActivityImportPreview(FileScope,CustomerImportPreview):
    operations={"POST":"activity.create"}

class ActivityImport(FileScope,CustomerImport):
    operations={"POST":"activity.create"}
    write_operation="activity.create"
    def audit(self,request,record,changed,receipt):
        schedule(record);emit(request,record,"created")
