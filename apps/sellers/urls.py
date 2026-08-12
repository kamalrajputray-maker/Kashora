from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.sellers.views import (
    SellerProfileAPIView,
    SellerDashboardAPIView,
    AdminSellerViewSet,
)

router = DefaultRouter()
router.register(r"admin/sellers", AdminSellerViewSet, basename="admin_seller")

urlpatterns = [
    # Seller routes
    path("seller/profile/", SellerProfileAPIView.as_view(), name="seller_profile"),
    path("seller/dashboard/", SellerDashboardAPIView.as_view(), name="seller_dashboard"),
    # Admin routes via router
    path("", include(router.urls)),
]
