from rest_framework import serializers
from decimal import Decimal
from apps.cart.models import Cart, CartItem, WishlistItem
from apps.catalog.models import ProductVariant


class CartItemSerializer(serializers.ModelSerializer):
    variant_id = serializers.UUIDField(source="variant.id", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True)
    price = serializers.DecimalField(source="variant.price", max_digits=10, decimal_places=2, read_only=True)
    subtotal = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    available_quantity = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "variant_id", "sku", "product_name", "product_slug",
            "price", "quantity", "subtotal", "in_stock",
            "available_quantity", "primary_image", "created_at"
        ]
        read_only_fields = ["id", "created_at"]

    def get_subtotal(self, obj):
        return obj.variant.price * obj.quantity

    def get_in_stock(self, obj):
        try:
            return obj.variant.inventory.available_quantity >= obj.quantity
        except AttributeError:
            return False

    def get_available_quantity(self, obj):
        try:
            return obj.variant.inventory.available_quantity
        except AttributeError:
            return 0

    def get_primary_image(self, obj):
        primary = obj.variant.product.images.filter(is_primary=True).first()
        if primary:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        first = obj.variant.product.images.first()
        if first:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(first.image.url)
            return first.image.url
        return None


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total_price", "created_at", "updated_at"]

    def get_total_price(self, obj):
        return sum(item.variant.price * item.quantity for item in obj.items.all())


class CartAddSerializer(serializers.Serializer):
    variant_id = serializers.UUIDField()
    quantity = serializers.IntegerField(default=1, min_value=1)

    def validate_variant_id(self, value):
        try:
            variant = ProductVariant.objects.get(pk=value, is_active=True)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError("Valid active variant not found.")
        return value

    def validate(self, attrs):
        variant = ProductVariant.objects.get(pk=attrs["variant_id"])
        try:
            available = variant.inventory.available_quantity
        except AttributeError:
            raise serializers.ValidationError({"quantity": "Inventory details not initialized for this variant."})

        if attrs["quantity"] > available:
            raise serializers.ValidationError({"quantity": f"Only {available} items in stock."})

        return attrs


class WishlistItemSerializer(serializers.ModelSerializer):
    variant_id = serializers.UUIDField(source="variant.id", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True)
    price = serializers.DecimalField(source="variant.price", max_digits=10, decimal_places=2, read_only=True)
    in_stock = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = WishlistItem
        fields = [
            "id", "variant_id", "sku", "product_name", "product_slug",
            "price", "in_stock", "primary_image", "created_at"
        ]
        read_only_fields = ["id", "created_at"]

    def get_in_stock(self, obj):
        try:
            return obj.variant.inventory.available_quantity > 0
        except AttributeError:
            return False

    def get_primary_image(self, obj):
        primary = obj.variant.product.images.filter(is_primary=True).first()
        if primary:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        first = obj.variant.product.images.first()
        if first:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(first.image.url)
            return first.image.url
        return None
