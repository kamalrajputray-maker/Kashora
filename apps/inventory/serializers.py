from rest_framework import serializers
from apps.inventory.models import Inventory, InventoryTransaction

class InventorySerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    attribute_summary = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Inventory
        fields = [
            "id",
            "variant",
            "variant_sku",
            "product_name",
            "attribute_summary",
            "available_quantity",
            "reserved_quantity",
            "sold_quantity",
            "low_stock_threshold",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "variant", "available_quantity", "reserved_quantity", "sold_quantity", "created_at", "updated_at"]

    def get_attribute_summary(self, obj):
        try:
            return obj.variant.attribute_summary
        except AttributeError:
            # Fallback to computing from attribute values if not populated
            values = obj.variant.attribute_values.all()
            if not values:
                return "—"
            return " / ".join([av.value for av in values])


class InventoryTransactionSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            "id",
            "inventory",
            "transaction_type",
            "quantity",
            "reference_type",
            "reference_id",
            "notes",
            "created_by_email",
            "created_at",
        ]
        read_only_fields = ["id", "inventory", "created_by_email", "created_at"]


class StockUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class StockAdjustmentSerializer(serializers.Serializer):
    quantity = serializers.IntegerField()  # Can be positive or negative
    low_stock_threshold = serializers.IntegerField(min_value=0, required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
