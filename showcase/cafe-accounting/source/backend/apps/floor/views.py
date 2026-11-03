from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.organizations.models import Branch
from apps.organizations.querysets import cafes_for_user

from .models import DiningTable
from .permissions import IsBranchMemberReadOnlyOrManager
from .serializers import DiningTableSerializer


class BranchTableMixin:
    permission_classes = [IsBranchMemberReadOnlyOrManager]
    serializer_class = DiningTableSerializer

    def get_branch(self):
        if not hasattr(self, "_branch"):
            self._branch = get_object_or_404(
                Branch.objects.filter(
                    cafe__in=cafes_for_user(self.request.user),
                    is_active=True,
                ),
                id=self.kwargs["branch_id"],
            )
        return self._branch

    def get_queryset(self):
        return DiningTable.objects.filter(branch=self.get_branch(), is_active=True)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["branch_id"] = self.kwargs["branch_id"]
        return context

    def destroy(self, request, *args, **kwargs):
        table = self.get_object()
        if table.orders.filter(status="open").exists():
            raise ValidationError({"detail": "میز دارای سفارش باز است و نمی‌تواند غیرفعال شود."})
        table.is_active = False
        table.save(update_fields=("is_active", "updated_at"))
        return Response(status=status.HTTP_204_NO_CONTENT)


class DiningTableListCreateView(BranchTableMixin, ListCreateAPIView):
    pagination_class = None


class DiningTableDetailView(BranchTableMixin, RetrieveUpdateDestroyAPIView):
    pass
