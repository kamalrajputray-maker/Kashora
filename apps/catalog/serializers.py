from itertools import product as cartesian_product
from rest_framework import serializers
from apps.catalog.models import Category, Product, ProductAttribute, ProductAttributeValue, ProductVariant
from apps.accounts.models import SellerProfile


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "image", "parent", "is_active", "sort_order", "children", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_children(self, obj):
        if obj.children.exists():
            return CategorySerializer(obj.children.all(), many=True).data
        return []

    def validate(self, attrs):
        parent = attrs.get("parent", None)
        if parent:
            if self.instance and parent == self.instance:
                raise serializers.ValidationError({"parent": "A category cannot be its own parent."})
            
            # Check circular hierarchy
            current_parent = parent
            while current_parent is not None:
                if self.instance and current_parent == self.instance:
                    raise serializers.ValidationError({"parent": "Circular category hierarchy is not allowed."})
                current_parent = current_parent.parent
        return attrs



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


# ──────────────────────────────────────────────
# ATTRIBUTE & VARIANT SERIALIZERS
# ──────────────────────────────────────────────

class ProductAttributeValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttributeValue
        fields = ["id", "value", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductAttributeSerializer(serializers.ModelSerializer):
    values = ProductAttributeValueSerializer(many=True, read_only=True)

    class Meta:
        model = ProductAttribute
        fields = ["id", "name", "values", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_name(self, value):
        """Ensure uniqueness of attribute name within the same product."""
        request = self.context.get("request")
        product_pk = self.context.get("product_pk")
        qs = ProductAttribute.objects.filter(product_id=product_pk, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"This product already has an attribute named '{value}'."
            )
        return value


class ProductVariantSerializer(serializers.ModelSerializer):
    attribute_values = serializers.PrimaryKeyRelatedField(
        queryset=ProductAttributeValue.objects.all(),
        many=True,
        required=False,
    )
    attribute_summary = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id", "product", "sku", "barcode",
            "price", "compare_at_price", "weight",
            "is_active", "attribute_values", "attribute_summary",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "product", "created_at", "updated_at"]

    def get_attribute_summary(self, obj):
        """Return human-readable attribute combination, e.g. 'Color: Red / Size: M'"""
        return " / ".join(
            f"{av.attribute.name}: {av.value}"
            for av in obj.attribute_values.select_related("attribute").all()
        )

    def validate_sku(self, value):
        """SKU must be globally unique."""
        qs = ProductVariant.objects.filter(sku=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A variant with this SKU already exists.")
        return value

    def validate(self, attrs):
        compare = attrs.get("compare_at_price")
        price = attrs.get("price", getattr(self.instance, "price", None))
        if compare is not None and price is not None and compare < price:
            raise serializers.ValidationError({
                "compare_at_price": "Compare-at price must be ≥ variant price."
            })
        return attrs

    def create(self, validated_data):
        attr_values = validated_data.pop("attribute_values", [])
        variant = ProductVariant.objects.create(**validated_data)
        if attr_values:
            variant.attribute_values.set(attr_values)
            # Validate unique combination AFTER setting M2M
            try:
                variant.validate_unique_combination([av.id for av in attr_values])
            except Exception as e:
                variant.delete()
                raise serializers.ValidationError(str(e))
        return variant

    def update(self, instance, validated_data):
        attr_values = validated_data.pop("attribute_values", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if attr_values is not None:
            instance.attribute_values.set(attr_values)
            try:
                instance.validate_unique_combination([av.id for av in attr_values])
            except Exception as e:
                raise serializers.ValidationError(str(e))
        return instance


class ProductVariantGenerateSerializer(serializers.Serializer):
    """
    Bulk generate variants from a Cartesian product of attribute values.
    Payload: { "base_price": 499, "attribute_value_groups": [[id1, id2], [id3, id4]] }
    attribute_value_groups is a list of lists — each inner list is one attribute's selected values.
    """
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    sku_prefix = serializers.CharField(max_length=20, required=False, default="SKU")
    attribute_value_groups = serializers.ListField(
        child=serializers.ListField(
            child=serializers.UUIDField()
        )
    )

