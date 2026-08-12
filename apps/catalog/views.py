from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter, UUIDFilter, NumberFilter
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import SellerProfile
from apps.accounts.permissions import IsAdminOrSuperAdmin, IsSeller
from apps.catalog.models import Category, Product
from apps.catalog.serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductSubmitSerializer,
    AdminProductListSerializer,
    AdminProductApprovalSerializer,
    AdminProductRejectionSerializer,
)


# ──────────────────────────────────────────────
# FILTER SET
# ──────────────────────────────────────────────

class ProductFilter(FilterSet):
    category = UUIDFilter(field_name="category__id")
    status = CharFilter(field_name="status")
    approval_status = CharFilter(field_name="approval_status")
    min_price = NumberFilter(field_name="base_price", lookup_expr="gte")
    max_price = NumberFilter(field_name="base_price", lookup_expr="lte")

    class Meta:
        model = Product
        fields = ["category", "status", "approval_status", "min_price", "max_price"]


# ──────────────────────────────────────────────
# CATEGORY VIEW (READ-ONLY, any authenticated user)
# ──────────────────────────────────────────────

class CategoryListAPIView(generics.ListAPIView):
    """
    GET /api/v1/categories/ - List all categories (read-only, for dropdowns)
    """
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Return full list for dropdown


# ──────────────────────────────────────────────
# SELLER PRODUCT VIEWSET
# ──────────────────────────────────────────────

class SellerProductViewSet(viewsets.ModelViewSet):
    """
    Seller product management. Sellers can only see/edit their own products.

    GET    /api/v1/seller/products/
    POST   /api/v1/seller/products/
    GET    /api/v1/seller/products/{id}/
    PATCH  /api/v1/seller/products/{id}/
    DELETE /api/v1/seller/products/{id}/
    POST   /api/v1/seller/products/{id}/submit/
    """

    permission_classes = [IsAuthenticated, IsSeller]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name", "brand", "description", "slug"]
    ordering_fields = ["created_at", "base_price", "name", "status", "approval_status"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        """Restrict to the logged-in seller's products only."""
        try:
            seller = self.request.user.seller_profile
        except SellerProfile.DoesNotExist:
            return Product.objects.none()
        return Product.objects.filter(seller=seller).select_related("category", "seller")

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        if self.action == "submit":
            return ProductSubmitSerializer
        return ProductDetailSerializer

    def perform_create(self, serializer):
        """Seller is set automatically from request.user — never from frontend input."""
        seller = self.request.user.seller_profile
        serializer.save(seller=seller)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """
        POST /api/v1/seller/products/{id}/submit/
        Move product from DRAFT or REJECTED → PENDING for admin review.
        Sellers can never self-approve.
        """
        product = self.get_object()

        if product.approval_status == "PENDING":
            return Response(
                {"detail": "This product is already pending review."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if product.approval_status == "APPROVED":
            return Response(
                {"detail": "This product has already been approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only DRAFT or REJECTED products may be submitted
        if product.status == "ARCHIVED":
            return Response(
                {"detail": "Archived products cannot be submitted for review."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product.approval_status = "PENDING"
        product.rejection_reason = None
        product.save(update_fields=["approval_status", "rejection_reason", "updated_at"])

        return Response(
            {
                "detail": "Product submitted for admin review.",
                "approval_status": product.approval_status,
            },
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────
# ADMIN PRODUCT VIEWSET
# ──────────────────────────────────────────────

class AdminProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin product review management.

    GET  /api/v1/admin/products/pending/
    POST /api/v1/admin/products/{id}/approve/
    POST /api/v1/admin/products/{id}/reject/
    """

    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    queryset = Product.objects.all().select_related("category", "seller", "seller__user")
    serializer_class = AdminProductListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name", "brand", "seller__business_name", "seller__user__phone"]
    ordering_fields = ["created_at", "base_price", "name", "approval_status"]
    ordering = ["-created_at"]

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        """
        GET /api/v1/admin/products/pending/
        List all products with PENDING approval status.
        """
        pending_qs = self.get_queryset().filter(approval_status="PENDING")
        page = self.paginate_queryset(pending_qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(pending_qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        POST /api/v1/admin/products/{id}/approve/
        Approve a product and mark it as ACTIVE.
        """
        product = self.get_object()

        if product.approval_status == "APPROVED":
            return Response(
                {"detail": "This product is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product.approval_status = "APPROVED"
        product.rejection_reason = None
        product.status = "ACTIVE"
        product.save(update_fields=["approval_status", "rejection_reason", "status", "updated_at"])

        return Response(
            {
                "detail": f"Product '{product.name}' has been approved and is now ACTIVE.",
                "approval_status": product.approval_status,
                "status": product.status,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """
        POST /api/v1/admin/products/{id}/reject/
        Reject a product. rejection_reason is required.
        """
        product = self.get_object()

        serializer = AdminProductRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product.approval_status = "REJECTED"
        product.rejection_reason = serializer.validated_data["rejection_reason"]
        product.status = "INACTIVE"
        product.save(update_fields=["approval_status", "rejection_reason", "status", "updated_at"])

        return Response(
            {
                "detail": f"Product '{product.name}' has been rejected.",
                "approval_status": product.approval_status,
                "rejection_reason": product.rejection_reason,
            },
            status=status.HTTP_200_OK,
        )
