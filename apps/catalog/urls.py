from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.catalog.views import (
    CategoryListAPIView,
    SellerProductViewSet,
    AdminProductViewSet,
)

router = DefaultRouter()
router.register(r"seller/products", SellerProductViewSet, basename="seller_product")
router.register(r"admin/products", AdminProductViewSet, basename="admin_product")

urlpatterns = [
    path("categories/", CategoryListAPIView.as_view(), name="category_list"),
    path("", include(router.urls)),
]
