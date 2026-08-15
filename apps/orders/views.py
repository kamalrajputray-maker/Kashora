from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404

from apps.orders.models import Order, OrderItem
from apps.orders.serializers import (
    OrderSerializer,
    OrderListSerializer,
    CheckoutSerializer,
    SellerOrderItemSerializer,
)
from apps.cart.models import Cart
from apps.inventory.models import Inventory, InventoryTransaction


class OrderViewSet(viewsets.ViewSet):
    """
    Buyer-facing order management.
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """GET /api/v1/orders/ — List all buyer orders."""
        orders = Order.objects.filter(buyer=request.user).prefetch_related("items")
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """GET /api/v1/orders/{id}/ — Order detail."""
        order = get_object_or_404(Order, pk=pk, buyer=request.user)
        serializer = OrderSerializer(order)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        """
        POST /api/v1/orders/checkout/
        Place order from active cart atomically:
        1. Validate cart is not empty
        2. Validate shipping address
        3. Lock inventory rows and deduct stock
        4. Create Order + OrderItems
        5. Create InventoryTransaction (RESERVE → SALE)
        6. Clear cart
        """
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Fetch cart
        try:
            cart = Cart.objects.prefetch_related(
                "items__variant__product__seller",
                "items__variant__inventory"
            ).get(user=request.user)
        except Cart.DoesNotExist:
            return Response({"detail": "Cart not found."}, status=status.HTTP_400_BAD_REQUEST)

        cart_items = cart.items.select_related(
            "variant", "variant__product", "variant__product__seller", "variant__inventory"
        ).all()

        if not cart_items.exists():
            return Response({"detail": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            total_amount = Decimal("0.00")
            max_shipping = Decimal("0.00")
            order_items_to_create = []

            for cart_item in cart_items:
                variant = cart_item.variant
                product = variant.product

                if not variant.is_active:
                    return Response(
                        {"detail": f"'{product.name}' variant is no longer available."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Lock the inventory row
                try:
                    inv = Inventory.objects.select_for_update().get(variant=variant)
                except Inventory.DoesNotExist:
                    return Response(
                        {"detail": f"No inventory for variant {variant.sku}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if inv.available_quantity < cart_item.quantity:
                    return Response(
                        {"detail": f"Insufficient stock for '{product.name}' ({variant.sku}). Only {inv.available_quantity} available."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                subtotal = variant.price * cart_item.quantity
                total_amount += subtotal
                if product.shipping_charge > max_shipping:
                    max_shipping = product.shipping_charge

                # Deduct inventory
                inv.available_quantity -= cart_item.quantity
                inv.reserved_quantity += cart_item.quantity
                inv.save()

                # Create inventory transaction
                InventoryTransaction.objects.create(
                    inventory=inv,
                    transaction_type="RESERVE",
                    quantity=-cart_item.quantity,
                    reference_type="ORDER",
                    reference_id=None,  # Will update after order creation
                    notes=f"Reserved for checkout by {request.user.phone}",
                    created_by=request.user
                )

                order_items_to_create.append({
                    "variant": variant,
                    "seller": product.seller,
                    "product_name": product.name,
                    "product_slug": product.slug,
                    "sku": variant.sku,
                    "price": variant.price,
                    "quantity": cart_item.quantity,
                    "subtotal": subtotal,
                })

            # Determine payment status for COD
            payment_status = "PAID" if data["payment_method"] == "COD" else "UNPAID"
            final_amount = total_amount + max_shipping

            # Create the Order
            order = Order.objects.create(
                buyer=request.user,
                payment_method=data["payment_method"],
                payment_status=payment_status,
                total_amount=total_amount,
                shipping_charge=max_shipping,
                discount_amount=Decimal("0.00"),
                final_amount=final_amount,
                shipping_address=data["shipping_address"],
                notes=data.get("notes", ""),
            )

            # Create OrderItems
            created_items = []
            for item_data in order_items_to_create:
                oi = OrderItem.objects.create(order=order, **item_data)
                created_items.append(oi)

            # Update inventory transaction reference_id now that order is created
            InventoryTransaction.objects.filter(
                reference_type="ORDER",
                reference_id=None,
                created_by=request.user
            ).update(reference_id=str(order.id))

            # Clear cart
            cart.items.all().delete()
            
            # Send Email Confirmation
            if request.user.email:
                try:
                    from django.core.mail import send_mail
                    from django.conf import settings
                    
                    item_names = ", ".join([item["product_name"] for item in order_items_to_create])
                    message = f"Hello {request.user.first_name or 'Customer'},\n\nYour order #{order.id} has been placed successfully!\n\nOrder Total: ₹{final_amount}\nItems: {item_names}\n\nThank you for shopping with us!"
                    
                    send_mail(
                        subject="Kashora Order Confirmation",
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[request.user.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_order(self, request, pk=None):
        """POST /api/v1/orders/{id}/cancel/ — Cancel a PENDING order."""
        order = get_object_or_404(Order, pk=pk, buyer=request.user)

        if order.status != "PENDING":
            return Response(
                {"detail": f"Order cannot be cancelled. Current status: {order.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Release reserved inventory
            for item in order.items.select_related("variant__inventory"):
                try:
                    inv = Inventory.objects.select_for_update().get(variant=item.variant)
                    inv.reserved_quantity -= item.quantity
                    inv.available_quantity += item.quantity
                    inv.save()

                    InventoryTransaction.objects.create(
                        inventory=inv,
                        transaction_type="RELEASE",
                        quantity=item.quantity,
                        reference_type="ORDER_CANCEL",
                        reference_id=str(order.id),
                        notes=f"Order cancelled by buyer {request.user.phone}",
                        created_by=request.user
                    )
                except Inventory.DoesNotExist:
                    pass

                item.item_status = "CANCELLED"
                item.save()

            order.status = "CANCELLED"
            order.save()

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


class SellerOrderViewSet(viewsets.ViewSet):
    """
    Seller-facing order item management.
    """
    permission_classes = [IsAuthenticated]

    def _get_seller_profile(self, user):
        from apps.accounts.models import SellerProfile
        try:
            return SellerProfile.objects.get(user=user)
        except SellerProfile.DoesNotExist:
            return None

    def list(self, request):
        """GET /api/v1/seller/orders/ — List order items for seller."""
        seller = self._get_seller_profile(request.user)
        if not seller:
            return Response({"detail": "Seller profile not found."}, status=status.HTTP_403_FORBIDDEN)

        items = OrderItem.objects.filter(
            seller=seller
        ).select_related("order", "order__buyer").order_by("-order__placed_at")

        serializer = SellerOrderItemSerializer(items, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """GET /api/v1/seller/orders/{id}/ — Single order item detail."""
        seller = self._get_seller_profile(request.user)
        if not seller:
            return Response({"detail": "Seller profile not found."}, status=status.HTTP_403_FORBIDDEN)

        item = get_object_or_404(OrderItem, pk=pk, seller=seller)
        serializer = SellerOrderItemSerializer(item)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """PATCH /api/v1/seller/orders/{id}/update-status/ — Update item status."""
        seller = self._get_seller_profile(request.user)
        if not seller:
            return Response({"detail": "Seller profile not found."}, status=status.HTTP_403_FORBIDDEN)

        item = get_object_or_404(OrderItem, pk=pk, seller=seller)
        new_status = request.data.get("item_status")

        VALID_TRANSITIONS = {
            "PENDING": ["CONFIRMED", "CANCELLED"],
            "CONFIRMED": ["SHIPPED", "CANCELLED"],
            "SHIPPED": ["DELIVERED"],
        }

        allowed = VALID_TRANSITIONS.get(item.item_status, [])
        if new_status not in allowed:
            return Response(
                {"detail": f"Cannot transition from '{item.item_status}' to '{new_status}'. Allowed: {allowed}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            item.item_status = new_status
            item.save()

            # If delivered, move reserved → sold
            if new_status == "DELIVERED":
                try:
                    inv = Inventory.objects.select_for_update().get(variant=item.variant)
                    inv.reserved_quantity -= item.quantity
                    inv.sold_quantity += item.quantity
                    inv.save()
                    InventoryTransaction.objects.create(
                        inventory=inv,
                        transaction_type="SALE",
                        quantity=-item.quantity,
                        reference_type="ORDER",
                        reference_id=str(item.order.id),
                        notes="Order delivered",
                        created_by=request.user
                    )
                except Inventory.DoesNotExist:
                    pass

        serializer = SellerOrderItemSerializer(item)
        return Response(serializer.data, status=status.HTTP_200_OK)
