from django.urls import path

from .views import (
    MenuCategoryDetailView,
    MenuCategoryListCreateView,
    MenuItemDetailView,
    MenuItemImageView,
    MenuItemListCreateView,
)

app_name = "menu"

urlpatterns = [
    path(
        "cafes/<uuid:cafe_id>/items/<uuid:pk>/image/",
        MenuItemImageView.as_view(),
        name="item-image",
    ),
    path(
        "cafes/<uuid:cafe_id>/categories/",
        MenuCategoryListCreateView.as_view(),
        name="category-list",
    ),
    path(
        "cafes/<uuid:cafe_id>/categories/<uuid:pk>/",
        MenuCategoryDetailView.as_view(),
        name="category-detail",
    ),
    path(
        "cafes/<uuid:cafe_id>/items/",
        MenuItemListCreateView.as_view(),
        name="item-list",
    ),
    path(
        "cafes/<uuid:cafe_id>/items/<uuid:pk>/",
        MenuItemDetailView.as_view(),
        name="item-detail",
    ),
]
