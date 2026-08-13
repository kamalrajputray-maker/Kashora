from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.cart.views import CartViewSet, WishlistViewSet

router = DefaultRouter()
router.register(r"wishlist", WishlistViewSet, basename="wishlist")

urlpatterns = [
    path("cart/", CartViewSet.as_view({"get": "list"}), name="cart-detail"),
    path("cart/add/", CartViewSet.as_view({"post": "add_item"}), name="cart-add"),
    path("cart/clear/", CartViewSet.as_view({"post": "clear_cart"}), name="cart-clear"),
    path("cart/item/<uuid:pk>/", CartViewSet.as_view({"patch": "manage_item", "delete": "manage_item"}), name="cart-item-manage"),
    path("", include(router.urls)),
]
