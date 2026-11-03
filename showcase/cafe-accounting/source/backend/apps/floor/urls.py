from django.urls import path

from .views import DiningTableDetailView, DiningTableListCreateView

app_name = "floor"

urlpatterns = [
    path(
        "branches/<uuid:branch_id>/tables/",
        DiningTableListCreateView.as_view(),
        name="table-list",
    ),
    path(
        "branches/<uuid:branch_id>/tables/<uuid:pk>/",
        DiningTableDetailView.as_view(),
        name="table-detail",
    ),
]
