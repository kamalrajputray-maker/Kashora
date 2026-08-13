from decimal import Decimal
from rest_framework import serializers
from apps.orders.models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id", "variant", "product_name", "product_slug", "sku",
            "price", "quantity", "subtotal", "item_status",
            "created_at", "updated_at"
        ]
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "status", "payment_status", "payment_method",
            "total_amount", "shipping_charge", "discount_amount", "final_amount",
            "shipping_address", "notes", "items", "placed_at", "updated_at"
        ]
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order list views."""
    item_count = serializers.SerializerMethodField()
    first_item_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "status", "payment_status", "payment_method",
            "final_amount", "item_count", "first_item_name", "placed_at"
        ]

    def get_item_count(self, obj):
        return obj.items.count()

    def get_first_item_name(self, obj):
        first = obj.items.first()
        return first.product_name if first else ""


class ShippingAddressSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    line1 = serializers.CharField(max_length=500)
    line2 = serializers.CharField(max_length=500, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    pincode = serializers.CharField(max_length=10)


class CheckoutSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=["COD", "PREPAID"], default="COD")
    shipping_address = ShippingAddressSerializer()
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)


class SellerOrderItemSerializer(serializers.ModelSerializer):
    """Serializer for seller's own items in an order."""
    order_id = serializers.UUIDField(source="order.id", read_only=True)
    buyer_phone = serializers.CharField(source="order.buyer.phone", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    payment_method = serializers.CharField(source="order.payment_method", read_only=True)
    shipping_address = serializers.JSONField(source="order.shipping_address", read_only=True)
    placed_at = serializers.DateTimeField(source="order.placed_at", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id", "order_id", "buyer_phone", "order_status", "payment_method",
            "product_name", "sku", "price", "quantity", "subtotal",
            "item_status", "shipping_address", "placed_at", "updated_at"
        ]
        read_only_fields = [
            "id", "order_id", "buyer_phone", "order_status", "payment_method",
            "product_name", "sku", "price", "quantity", "subtotal",
            "shipping_address", "placed_at", "updated_at"
        ]
