from django.urls import path

from .views import HomepageAPIView, PublicArticleListView, PublicArticleDetailView


app_name = "homepage"


urlpatterns = [
    path("articles/", PublicArticleListView.as_view(), name="article-list"),
    path("articles/<str:slug>/", PublicArticleDetailView.as_view(), name="article-detail"),
    path(
        "",
        HomepageAPIView.as_view(),
        name="homepage",
    ),
]