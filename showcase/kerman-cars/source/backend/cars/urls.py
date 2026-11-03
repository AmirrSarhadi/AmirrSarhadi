from django.urls import path

from .views import BrandListView, CarModelListView, CarTrimListView

urlpatterns = [
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("models/", CarModelListView.as_view(), name="car-model-list"),
    path("trims/", CarTrimListView.as_view(), name="car-trim-list"),
]
