from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.orders.views import OrderViewSet, SellerOrderViewSet

router = DefaultRouter()
router.register(r"seller/orders", SellerOrderViewSet, basename="seller-orders")

urlpatterns = [
    # Buyer order routes
    path("orders/", OrderViewSet.as_view({"get": "list"}), name="order-list"),
    path("orders/checkout/", OrderViewSet.as_view({"post": "checkout"}), name="order-checkout"),
    path("orders/<uuid:pk>/", OrderViewSet.as_view({"get": "retrieve"}), name="order-detail"),
    path("orders/<uuid:pk>/cancel/", OrderViewSet.as_view({"post": "cancel_order"}), name="order-cancel"),

    # Seller order routes
    path("", include(router.urls)),
]
