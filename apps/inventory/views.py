from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import SellerProfile
from apps.accounts.permissions import IsSeller
from apps.inventory.models import Inventory, InventoryTransaction
from apps.inventory.serializers import (
    InventorySerializer,
    InventoryTransactionSerializer,
    StockUpdateSerializer,
    StockAdjustmentSerializer,
)


class SellerInventoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for sellers to view and manage their stock levels.
    """
    permission_classes = [IsAuthenticated, IsSeller]
    serializer_class = InventorySerializer
    pagination_class = None

    def get_queryset(self):
        try:
            seller = self.request.user.seller_profile
        except SellerProfile.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have a seller profile.")
        
        return Inventory.objects.filter(variant__product__seller=seller).select_related(
            "variant", "variant__product"
        ).order_by("variant__product__name", "variant__sku")

    @action(detail=True, methods=["post"], url_path="add-stock")
    def add_stock(self, request, pk=None):
        inventory = self.get_object()
        serializer = StockUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        qty = serializer.validated_data["quantity"]
        notes = serializer.validated_data["notes"]

        with transaction.atomic():
            locked_inventory = Inventory.objects.select_for_update().get(pk=inventory.pk)
            locked_inventory.available_quantity += qty
            locked_inventory.save()

            InventoryTransaction.objects.create(
                inventory=locked_inventory,
                transaction_type="STOCK_IN",
                quantity=qty,
                notes=notes,
                created_by=request.user
            )

        return Response(InventorySerializer(locked_inventory).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def adjust(self, request, pk=None):
        inventory = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        qty = serializer.validated_data["quantity"]
        threshold = serializer.validated_data.get("low_stock_threshold")
        notes = serializer.validated_data["notes"]

        with transaction.atomic():
            locked_inventory = Inventory.objects.select_for_update().get(pk=inventory.pk)
            
            if qty < 0 and (locked_inventory.available_quantity + qty) < 0:
                return Response(
                    {"detail": "Adjustment would result in negative available quantity."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            locked_inventory.available_quantity += qty
            if threshold is not None:
                locked_inventory.low_stock_threshold = threshold
            
            locked_inventory.save()

            tx_type = "ADJUSTMENT"
            if qty > 0:
                tx_type = "STOCK_IN"
            elif qty < 0:
                tx_type = "STOCK_OUT"

            InventoryTransaction.objects.create(
                inventory=locked_inventory,
                transaction_type=tx_type,
                quantity=qty,
                notes=notes,
                created_by=request.user
            )

        return Response(InventorySerializer(locked_inventory).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def transactions(self, request, pk=None):
        inventory = self.get_object()
        txs = inventory.transactions.all()
        page = self.paginate_queryset(txs)
        if page is not None:
            serializer = InventoryTransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = InventoryTransactionSerializer(txs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
