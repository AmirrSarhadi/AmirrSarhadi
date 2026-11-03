from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import Brand, CarModel, CarTrim
from .serializers import BrandSerializer, CarModelSerializer, CarTrimSerializer


class BrandListView(ListAPIView):
    serializer_class = BrandSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Brand.objects.filter(is_active=True).order_by("sort_order", "name")


class CarModelListView(ListAPIView):
    serializer_class = CarModelSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = (
            CarModel.objects
            .filter(is_active=True, brand__is_active=True)
            .select_related("brand")
            .order_by("brand__name", "sort_order", "name")
        )

        brand_id = self.request.query_params.get("brand")
        if brand_id:
            queryset = queryset.filter(brand_id=brand_id)

        return queryset


class CarTrimListView(ListAPIView):
    serializer_class = CarTrimSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = (
            CarTrim.objects
            .filter(
                is_active=True,
                car_model__is_active=True,
                car_model__brand__is_active=True,
            )
            .select_related("car_model", "car_model__brand")
            .order_by("car_model__brand__name", "car_model__name", "sort_order", "name")
        )

        brand_id = self.request.query_params.get("brand")
        car_model_id = self.request.query_params.get("car_model")

        if brand_id:
            queryset = queryset.filter(car_model__brand_id=brand_id)

        if car_model_id:
            queryset = queryset.filter(car_model_id=car_model_id)

        return queryset
