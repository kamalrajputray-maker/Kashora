from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.inventory.views import SellerInventoryViewSet

router = DefaultRouter()
router.register(r"seller/inventory", SellerInventoryViewSet, basename="seller_inventory")

urlpatterns = [
    path("", include(router.urls)),
]
