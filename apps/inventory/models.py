import uuid
from django.db import models
from django.conf import settings
from apps.catalog.models import ProductVariant

class Inventory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    variant = models.OneToOneField(ProductVariant, on_delete=models.CASCADE, related_name="inventory")
    available_quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    sold_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory"
        verbose_name_plural = "Inventories"

    @property
    def status(self):
        if self.available_quantity == 0:
            return "OUT_OF_STOCK"
        elif self.available_quantity <= self.low_stock_threshold:
            return "LOW_STOCK"
        return "IN_STOCK"

    def __str__(self):
        return f"Inventory for {self.variant.sku} (Avail: {self.available_quantity})"


class InventoryTransaction(models.Model):
    TRANSACTION_TYPES = [
        ("STOCK_IN", "Stock In"),
        ("STOCK_OUT", "Stock Out"),
        ("RESERVE", "Reserve"),
        ("RELEASE", "Release"),
        ("SALE", "Sale"),
        ("ADJUSTMENT", "Adjustment"),
        ("RETURN", "Return"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()
    reference_type = models.CharField(max_length=50, blank=True, null=True)
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type} of {self.quantity} for {self.inventory.variant.sku}"
