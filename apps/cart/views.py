from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from apps.cart.models import Cart, CartItem, WishlistItem
from apps.catalog.models import ProductVariant
from apps.cart.serializers import (
    CartSerializer,
    CartItemSerializer,
    CartAddSerializer,
    WishlistItemSerializer,
)


class CartViewSet(viewsets.ViewSet):
    """
    Manage user shopping cart.
    Authenticated users only.
    """
    permission_classes = [IsAuthenticated]

    def _get_or_create_cart(self, user):
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    def list(self, request):
        """
        GET /api/v1/cart/
        Return active cart with items list.
        """
        cart = self._get_or_create_cart(request.user)
        serializer = CartSerializer(cart, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="add")
    def add_item(self, request):
        """
        POST /api/v1/cart/add/
        Add a variant to shopping cart.
        """
        cart = self._get_or_create_cart(request.user)
        serializer = CartAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        v_id = serializer.validated_data["variant_id"]
        qty = serializer.validated_data["quantity"]

        variant = ProductVariant.objects.get(pk=v_id)

        with transaction.atomic():
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                variant=variant,
                defaults={"quantity": qty}
            )
            if not created:
                # Update quantity and validate stock availability
                new_qty = cart_item.quantity + qty
                available = variant.inventory.available_quantity
                if new_qty > available:
                    return Response(
                        {"quantity": f"Cannot add. Total cart quantity {new_qty} exceeds stock limit of {available}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                cart_item.quantity = new_qty
                cart_item.save()

        return Response(CartSerializer(cart, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="clear")
    def clear_cart(self, request):
        """
        POST /api/v1/cart/clear/
        Empty the entire cart.
        """
        cart = self._get_or_create_cart(request.user)
        cart.items.all().delete()
        return Response({"detail": "Shopping cart cleared."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch", "delete"], url_path="item")
    def manage_item(self, request, pk=None):
        """
        PATCH  /api/v1/cart/item/{id}/ - Modify item quantity
        DELETE /api/v1/cart/item/{id}/ - Remove item from cart
        """
        cart = self._get_or_create_cart(request.user)
        item = get_object_or_404(CartItem, pk=pk, cart=cart)

        if request.method == "DELETE":
            item.delete()
            return Response(CartSerializer(cart, context={"request": request}).data, status=status.HTTP_200_OK)

        elif request.method == "PATCH":
            new_qty = request.data.get("quantity")
            if new_qty is None:
                return Response({"quantity": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                new_qty = int(new_qty)
            except ValueError:
                return Response({"quantity": "Must be a valid integer."}, status=status.HTTP_400_BAD_REQUEST)

            if new_qty < 1:
                return Response({"quantity": "Quantity must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)

            # Validate stock limit
            available = item.variant.inventory.available_quantity
            if new_qty > available:
                return Response(
                    {"quantity": f"Only {available} items in stock. Cannot update quantity to {new_qty}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            item.quantity = new_qty
            item.save()
            return Response(CartSerializer(cart, context={"request": request}).data, status=status.HTTP_200_OK)


class WishlistViewSet(viewsets.ModelViewSet):
    """
    Manage user wishlist items.
    Authenticated users only.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = WishlistItemSerializer
    http_method_names = ["get", "post", "delete"]
    pagination_class = None

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user).select_related(
            "variant", "variant__product"
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="add")
    def add_to_wishlist(self, request):
        """
        POST /api/v1/wishlist/add/
        Add a variant SKU to wishlist.
        """
        variant_id = request.data.get("variant_id")
        if not variant_id:
            return Response({"variant_id": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        variant = get_object_or_404(ProductVariant, pk=variant_id, is_active=True)

        wish_item, created = WishlistItem.objects.get_or_create(
            user=request.user,
            variant=variant
        )
        serializer = WishlistItemSerializer(wish_item, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
