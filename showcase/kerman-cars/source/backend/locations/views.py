from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import (
    Province,
    City,
    Neighborhood,
)

from .serializers import (
    ProvinceSerializer,
    CitySerializer,
    NeighborhoodSerializer,
)


class ProvinceListView(ListAPIView):
    serializer_class = ProvinceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Province.objects.filter(is_active=True).order_by("name")


class CityListView(ListAPIView):
    serializer_class = CitySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = City.objects.filter(is_active=True).select_related("province").order_by("name")
        province_id = self.request.query_params.get("province")
        if province_id:
            queryset = queryset.filter(province_id=province_id)
        return queryset


class NeighborhoodListView(ListAPIView):
    serializer_class = NeighborhoodSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = (
            Neighborhood.objects
            .filter(
                is_active=True,
                city__is_active=True,
            )
            .select_related("city")
            .order_by("name")
        )

        city_id = (
            self.request
            .query_params
            .get("city")
        )

        if city_id:
            queryset = queryset.filter(
                city_id=city_id
            )

        return queryset