from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from apps.catalog.views import (
    CategoryListAPIView,
    CategoryDetailAPIView,
    SellerProductViewSet,
    AdminProductViewSet,
    AdminCategoryViewSet,
    SellerProductAttributeViewSet,
    SellerProductVariantViewSet,
    SellerProductImageViewSet,
    PublicProductViewSet,
)

# Root router
router = DefaultRouter()
router.register(r"products", PublicProductViewSet, basename="public_product")
router.register(r"seller/products", SellerProductViewSet, basename="seller_product")
router.register(r"admin/products", AdminProductViewSet, basename="admin_product")
router.register(r"admin/categories", AdminCategoryViewSet, basename="admin_category")

# Nested router: seller/products/{product_pk}/attributes/ and variants/
products_router = nested_routers.NestedDefaultRouter(router, r"seller/products", lookup="product")
products_router.register(r"attributes", SellerProductAttributeViewSet, basename="seller_product_attribute")
products_router.register(r"variants", SellerProductVariantViewSet, basename="seller_product_variant")
products_router.register(r"images", SellerProductImageViewSet, basename="seller_product_image")

urlpatterns = [
    path("categories/", CategoryListAPIView.as_view(), name="category_list"),
    path("categories/<slug:slug>/", CategoryDetailAPIView.as_view(), name="category_detail"),
    path("", include(router.urls)),
    path("", include(products_router.urls)),
]
