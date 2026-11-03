from django.db.models import Count, Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.organizations.querysets import cafes_for_user

from .models import MenuCategory, MenuItem
from .permissions import IsCafeMemberReadOnlyOrManager
from .serializers import MenuCategorySerializer, MenuItemSerializer


class CafeScopedMixin:
    permission_classes = [IsCafeMemberReadOnlyOrManager]

    def get_cafe(self):
        if not hasattr(self, "_cafe"):
            self._cafe = get_object_or_404(
                cafes_for_user(self.request.user),
                id=self.kwargs["cafe_id"],
            )
        return self._cafe

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["cafe_id"] = self.kwargs["cafe_id"]
        return context

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        if hasattr(instance, "is_available"):
            instance.is_available = False
            instance.save(update_fields=("is_active", "is_available", "updated_at"))
        else:
            instance.save(update_fields=("is_active", "updated_at"))
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryQuerysetMixin(CafeScopedMixin):
    serializer_class = MenuCategorySerializer

    def get_queryset(self):
        return (
            MenuCategory.objects.filter(cafe=self.get_cafe(), is_active=True)
            .annotate(item_count=Count("items", filter=Q(items__is_active=True)))
            .order_by("sort_order", "name")
        )


class MenuCategoryListCreateView(CategoryQuerysetMixin, ListCreateAPIView):
    pagination_class = None


class MenuCategoryDetailView(CategoryQuerysetMixin, RetrieveUpdateDestroyAPIView):
    pass


class ItemQuerysetMixin(CafeScopedMixin):
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    serializer_class = MenuItemSerializer

    def get_queryset(self):
        return MenuItem.objects.filter(
            category__cafe=self.get_cafe(),
            category__is_active=True,
            is_active=True,
        ).select_related("category")


class MenuItemListCreateView(ItemQuerysetMixin, ListCreateAPIView):
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset


class MenuItemDetailView(ItemQuerysetMixin, RetrieveUpdateDestroyAPIView):
    pass


class MenuItemImageView(ItemQuerysetMixin, RetrieveUpdateDestroyAPIView):
    http_method_names = ["get", "head", "options"]

    def get(self, request, *args, **kwargs):
        item = self.get_object()
        if not item.image:
            raise Http404
        try:
            response = FileResponse(item.image.open("rb"), content_type="image/jpeg")
        except FileNotFoundError as error:
            raise Http404 from error
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
