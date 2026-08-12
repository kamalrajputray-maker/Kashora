from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.models import SellerProfile
from apps.accounts.constants import RoleType
from apps.sellers.serializers import (
    SellerProfileSerializer,
    SellerProfileUpdateSerializer,
    AdminSellerListSerializer,
    AdminSellerDetailSerializer,
    SellerApprovalSerializer,
    SellerRejectionSerializer,
    SellerSuspensionSerializer,
    SellerBlockSerializer,
)
from apps.sellers.permissions import (
    IsSeller,
    IsSellerOwner,
    IsAdminOrSuperAdmin,
    CanApproveSeller,
)

User = get_user_model()


class SellerProfileAPIView(generics.RetrieveUpdateAPIView):
    """
    API view for sellers to retrieve and update their own profile.
    
    GET /api/v1/seller/profile/ - Get seller profile
    PATCH /api/v1/seller/profile/ - Update seller profile
    """

    serializer_class = SellerProfileSerializer
    permission_classes = [IsAuthenticated, IsSeller]

    def get_object(self):
        """Get the seller profile for the current user"""
        try:
            return self.request.user.seller_profile
        except SellerProfile.DoesNotExist:
            self.permission_denied(
                self.request, "Seller profile does not exist for this user."
            )

    def get_serializer_class(self):
        """Use update serializer for PATCH requests"""
        if self.request.method == "PATCH":
            return SellerProfileUpdateSerializer
        return SellerProfileSerializer

    def partial_update(self, request, *args, **kwargs):
        """Override to provide custom response"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full profile after update
        response_serializer = SellerProfileSerializer(instance)
        return Response(response_serializer.data)


class SellerDashboardAPIView(generics.RetrieveAPIView):
    """
    API view for seller dashboard with summary statistics.
    
    GET /api/v1/seller/dashboard/ - Get seller dashboard data
    """

    permission_classes = [IsAuthenticated, IsSeller]
    serializer_class = SellerProfileSerializer

    def get_object(self):
        """Get the seller profile for the current user"""
        try:
            return self.request.user.seller_profile
        except SellerProfile.DoesNotExist:
            self.permission_denied(
                self.request, "Seller profile does not exist for this user."
            )

    def retrieve(self, request, *args, **kwargs):
        """Return dashboard data with product and inventory statistics"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Add dashboard statistics
        # These will return 0 until product and inventory modules are created
        data["dashboard"] = {
            "status": instance.get_status_display(),
            "total_products": 0,
            "approved_products": 0,
            "pending_products": 0,
            "rejected_products": 0,
            "total_inventory": 0,
            "low_stock_products": 0,
        }
        
        return Response(data)


class AdminSellerViewSet(viewsets.ModelViewSet):
    """
    Admin API for managing sellers.
    
    GET /api/v1/admin/sellers/ - List all sellers with filtering
    GET /api/v1/admin/sellers/{id}/ - Get seller details
    POST /api/v1/admin/sellers/{id}/approve/ - Approve seller
    POST /api/v1/admin/sellers/{id}/reject/ - Reject seller
    POST /api/v1/admin/sellers/{id}/suspend/ - Suspend seller
    POST /api/v1/admin/sellers/{id}/activate/ - Activate seller
    POST /api/v1/admin/sellers/{id}/block/ - Block seller
    """

    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    queryset = SellerProfile.objects.all().select_related("user", "rejected_by")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "city", "state", "kyc_status"]
    search_fields = ["user__phone", "user__email", "business_name", "gst_number"]
    ordering_fields = ["created_at", "business_name", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        """Use different serializers for list and detail"""
        if self.action in ["list"]:
            return AdminSellerListSerializer
        elif self.action in ["retrieve"]:
            return AdminSellerDetailSerializer
        elif self.action == "approve":
            return SellerApprovalSerializer
        elif self.action == "reject":
            return SellerRejectionSerializer
        elif self.action in ["suspend", "activate"]:
            return SellerSuspensionSerializer
        elif self.action == "block":
            return SellerBlockSerializer
        return AdminSellerDetailSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a seller"""
        seller = self.get_object()
        
        # Check if seller is already approved
        if seller.status == "APPROVED":
            return Response(
                {"detail": "Seller is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Approve the seller
        seller.status = "APPROVED"
        seller.rejection_reason = None
        seller.rejected_by = None
        seller.rejected_at = None
        seller.save()
        
        return Response(
            {
                "message": f"Seller {seller.user.phone} has been approved successfully.",
                "status": seller.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a seller"""
        seller = self.get_object()
        
        # Validate input
        serializer = SellerRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if seller is already rejected
        if seller.status == "REJECTED":
            return Response(
                {"detail": "Seller is already rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Reject the seller
        seller.status = "REJECTED"
        seller.rejection_reason = serializer.validated_data["rejection_reason"]
        seller.rejected_by = request.user
        seller.rejected_at = timezone.now()
        seller.save()
        
        return Response(
            {
                "message": f"Seller {seller.user.phone} has been rejected.",
                "status": seller.get_status_display(),
                "rejection_reason": seller.rejection_reason,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        """Suspend a seller"""
        seller = self.get_object()
        
        # Check if seller is already suspended
        if seller.status == "SUSPENDED":
            return Response(
                {"detail": "Seller is already suspended."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Only allow suspending approved sellers
        if seller.status != "APPROVED":
            return Response(
                {"detail": "Only approved sellers can be suspended."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Suspend the seller
        seller.status = "SUSPENDED"
        seller.save()
        
        return Response(
            {
                "message": f"Seller {seller.user.phone} has been suspended.",
                "status": seller.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Activate a suspended seller"""
        seller = self.get_object()
        
        # Check if seller is suspended
        if seller.status != "SUSPENDED":
            return Response(
                {"detail": "Only suspended sellers can be activated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Activate the seller
        seller.status = "APPROVED"
        seller.save()
        
        return Response(
            {
                "message": f"Seller {seller.user.phone} has been activated.",
                "status": seller.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def block(self, request, pk=None):
        """Block a seller"""
        seller = self.get_object()
        
        # Check if seller is already blocked
        if seller.status == "BLOCKED":
            return Response(
                {"detail": "Seller is already blocked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Block the seller
        seller.status = "BLOCKED"
        seller.save()
        
        return Response(
            {
                "message": f"Seller {seller.user.phone} has been blocked.",
                "status": seller.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )
