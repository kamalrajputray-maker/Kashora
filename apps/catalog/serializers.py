from rest_framework import serializers
from apps.catalog.models import Category, Product
from apps.accounts.models import SellerProfile


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


# ──────────────────────────────────────────────
# SELLER-FACING SERIALIZERS
# ──────────────────────────────────────────────

class ProductListSerializer(serializers.ModelSerializer):
    """Compact serializer used in seller product list."""
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "brand",
            "base_price", "compare_at_price",
            "status", "approval_status",
            "category", "category_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "approval_status", "created_at", "updated_at"]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for seller product view/edit."""
    category_name = serializers.CharField(source="category.name", read_only=True)
    seller_store = serializers.CharField(source="seller.store_name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "seller", "seller_store",
            "category", "category_name",
            "name", "slug", "description", "brand",
            "base_price", "compare_at_price",
            "tax_percentage", "shipping_charge",
            "returnable", "return_window_days",
            "status", "approval_status", "rejection_reason",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "seller", "seller_store",
            "approval_status", "rejection_reason",
            "created_at", "updated_at",
        ]

    def validate_slug(self, value):
        """Validate that slug is unique, excluding the current instance."""
        instance = self.instance
        qs = Product.objects.filter(slug=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A product with this slug already exists.")
        return value

    def validate(self, attrs):
        compare = attrs.get("compare_at_price", getattr(self.instance, "compare_at_price", None))
        base = attrs.get("base_price", getattr(self.instance, "base_price", None))
        if compare is not None and base is not None and compare < base:
            raise serializers.ValidationError({
                "compare_at_price": "Compare-at price must be ≥ base price."
            })
        return attrs

    def create(self, validated_data):
        """Assign the seller from the request context — never trust the frontend."""
        request = self.context.get("request")
        seller_profile = request.user.seller_profile
        validated_data["seller"] = seller_profile
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Seller must not be changed via update
        validated_data.pop("seller", None)
        return super().update(instance, validated_data)


class ProductSubmitSerializer(serializers.Serializer):
    """Used only for the /submit/ action — no fields required."""
    pass


# ──────────────────────────────────────────────
# ADMIN-FACING SERIALIZERS
# ──────────────────────────────────────────────

class AdminProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    seller_store = serializers.CharField(source="seller.store_name", read_only=True)
    seller_phone = serializers.CharField(source="seller.user.phone", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "brand",
            "base_price", "compare_at_price",
            "status", "approval_status", "rejection_reason",
            "seller", "seller_store", "seller_phone",
            "category", "category_name",
            "created_at", "updated_at",
        ]
        read_only_fields = fields


class AdminProductApprovalSerializer(serializers.Serializer):
    """Used when admin approves a product."""
    pass


class AdminProductRejectionSerializer(serializers.Serializer):
    """Used when admin rejects a product — rejection_reason is required."""
    rejection_reason = serializers.CharField(required=True, min_length=5)
