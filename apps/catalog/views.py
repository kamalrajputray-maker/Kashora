from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter, UUIDFilter, NumberFilter
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import SellerProfile
from apps.accounts.permissions import IsAdminOrSuperAdmin, IsSeller
from apps.catalog.models import Category, Product, ProductAttribute, ProductAttributeValue, ProductVariant, ProductImage
from apps.catalog.serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductSubmitSerializer,
    AdminProductListSerializer,
    AdminProductApprovalSerializer,
    AdminProductRejectionSerializer,
    ProductAttributeSerializer,
    ProductAttributeValueSerializer,
    ProductVariantSerializer,
    ProductVariantGenerateSerializer,
    ProductImageSerializer,
    PublicProductListSerializer,
    PublicProductDetailSerializer,
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
# PUBLIC VIEWS
# ──────────────────────────────────────────────

class CategoryListAPIView(generics.ListAPIView):
    """
    Public endpoint to list only active categories.
    """
    queryset = Category.objects.filter(is_active=True).order_by("sort_order", "name")
    serializer_class = CategorySerializer
    permission_classes = []
    pagination_class = None

class CategoryDetailAPIView(generics.RetrieveAPIView):
    """
    Public endpoint to retrieve a specific active category by slug.
    """
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = []
    lookup_field = "slug"

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


class AdminCategoryViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint for managing categories.
    Requires ADMIN or SUPER_ADMIN role.
    """
    queryset = Category.objects.all().order_by("sort_order", "name")
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ["name", "description"]
    filterset_fields = ["is_active", "parent"]
    ordering_fields = ["name", "created_at", "sort_order"]

    def destroy(self, request, *args, **kwargs):
        from django.db.models.deletion import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Cannot delete this category because it contains child categories or products."},
                status=status.HTTP_400_BAD_REQUEST
            )


# ──────────────────────────────────────────────
# SELLER PRODUCT ATTRIBUTE VIEWSET
# ──────────────────────────────────────────────

class SellerProductAttributeViewSet(viewsets.ModelViewSet):
    """
    Manage attributes for a specific product.
    Only the product's seller can access these.

    GET    /api/v1/seller/products/{product_pk}/attributes/
    POST   /api/v1/seller/products/{product_pk}/attributes/
    GET    /api/v1/seller/products/{product_pk}/attributes/{id}/
    PATCH  /api/v1/seller/products/{product_pk}/attributes/{id}/
    DELETE /api/v1/seller/products/{product_pk}/attributes/{id}/
    """
    permission_classes = [IsAuthenticated, IsSeller]
    serializer_class = ProductAttributeSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def _get_product(self):
        """Return product belonging to the logged-in seller, or 404."""
        try:
            seller = self.request.user.seller_profile
        except SellerProfile.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have a seller profile.")
        from django.shortcuts import get_object_or_404
        return get_object_or_404(Product, pk=self.kwargs["product_pk"], seller=seller)

    def get_queryset(self):
        product = self._get_product()
        return ProductAttribute.objects.filter(product=product).prefetch_related("values")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["product_pk"] = self.kwargs.get("product_pk")
        return ctx

    def perform_create(self, serializer):
        product = self._get_product()
        serializer.save(product=product)

    @action(detail=True, methods=["post"], url_path="values")
    def add_value(self, request, product_pk=None, pk=None):
        """
        POST /api/v1/seller/products/{product_pk}/attributes/{id}/values/
        Add a new value to an attribute.
        """
        attribute = self.get_object()
        serializer = ProductAttributeValueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        value_text = serializer.validated_data["value"]
        if attribute.values.filter(value__iexact=value_text).exists():
            return Response(
                {"detail": f"Value '{value_text}' already exists for this attribute."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        av = attribute.values.create(value=value_text)
        return Response(ProductAttributeValueSerializer(av).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"values/(?P<value_pk>[^/.]+)")
    def remove_value(self, request, product_pk=None, pk=None, value_pk=None):
        """
        DELETE /api/v1/seller/products/{product_pk}/attributes/{id}/values/{value_pk}/
        Remove a specific value from an attribute.
        """
        attribute = self.get_object()
        from django.shortcuts import get_object_or_404
        av = get_object_or_404(ProductAttributeValue, pk=value_pk, attribute=attribute)
        av.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────
# SELLER PRODUCT VARIANT VIEWSET
# ──────────────────────────────────────────────

class SellerProductVariantViewSet(viewsets.ModelViewSet):
    """
    Manage variants for a specific product.
    Only the product's seller can access these.

    GET    /api/v1/seller/products/{product_pk}/variants/
    POST   /api/v1/seller/products/{product_pk}/variants/
    PATCH  /api/v1/seller/products/{product_pk}/variants/{id}/
    DELETE /api/v1/seller/products/{product_pk}/variants/{id}/
    POST   /api/v1/seller/products/{product_pk}/variants/generate/
    """
    permission_classes = [IsAuthenticated, IsSeller]
    serializer_class = ProductVariantSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def _get_product(self):
        try:
            seller = self.request.user.seller_profile
        except SellerProfile.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have a seller profile.")
        from django.shortcuts import get_object_or_404
        return get_object_or_404(Product, pk=self.kwargs["product_pk"], seller=seller)

    def get_queryset(self):
        product = self._get_product()
        return ProductVariant.objects.filter(product=product).prefetch_related(
            "attribute_values__attribute"
        )

    def perform_create(self, serializer):
        product = self._get_product()
        serializer.save(product=product)

    @action(detail=False, methods=["post"])
    def generate(self, request, product_pk=None):
        """
        POST /api/v1/seller/products/{product_pk}/variants/generate/
        Bulk-generate variants from Cartesian product of attribute value groups.
        """
        import itertools, uuid as uuid_lib
        product = self._get_product()
        serializer = ProductVariantGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        base_price = serializer.validated_data["base_price"]
        sku_prefix = serializer.validated_data.get("sku_prefix", "SKU")
        groups = serializer.validated_data["attribute_value_groups"]

        # Resolve UUIDs to model instances and validate they belong to this product
        resolved_groups = []
        for group in groups:
            values = []
            for av_id in group:
                try:
                    av = ProductAttributeValue.objects.get(pk=av_id, attribute__product=product)
                    values.append(av)
                except ProductAttributeValue.DoesNotExist:
                    return Response(
                        {"detail": f"Attribute value {av_id} does not belong to this product."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            resolved_groups.append(values)

        if not resolved_groups:
            return Response({"detail": "No attribute value groups provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate Cartesian product of all value combinations
        combos = list(itertools.product(*resolved_groups))
        created = []
        skipped = []

        for combo in combos:
            av_ids = [av.id for av in combo]
            # Build a short SKU from values
            slug_part = "-".join(av.value[:3].upper() for av in combo)
            sku_candidate = f"{sku_prefix}-{slug_part}-{str(uuid_lib.uuid4())[:4].upper()}"

            # Check for duplicate combo
            from django.db.models import Count
            existing_ids = set(av_ids)
            n = len(existing_ids)
            duplicate = False
            candidates = ProductVariant.objects.filter(
                product=product,
                attribute_values__id__in=existing_ids,
            ).annotate(match_count=Count("attribute_values")).filter(match_count=n)
            for candidate in candidates:
                if set(candidate.attribute_values.values_list("id", flat=True)) == existing_ids:
                    duplicate = True
                    skipped.append({"combo": [str(i) for i in av_ids], "reason": "Duplicate combination"})
                    break

            if not duplicate:
                variant = ProductVariant.objects.create(
                    product=product,
                    sku=sku_candidate,
                    price=base_price,
                    is_active=True,
                )
                variant.attribute_values.set(combo)
                created.append(ProductVariantSerializer(variant).data)

        return Response({
            "created": len(created),
            "skipped": len(skipped),
            "variants": created,
            "skipped_details": skipped,
        }, status=status.HTTP_201_CREATED)


class SellerProductImageViewSet(viewsets.ModelViewSet):
    """
    Manage images for a specific product.
    Only the product's seller can access these.
    """
    permission_classes = [IsAuthenticated, IsSeller]
    serializer_class = ProductImageSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def _get_product(self):
        try:
            seller = self.request.user.seller_profile
        except SellerProfile.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have a seller profile.")
        from django.shortcuts import get_object_or_404
        return get_object_or_404(Product, pk=self.kwargs["product_pk"], seller=seller)

    def get_queryset(self):
        product = self._get_product()
        return ProductImage.objects.filter(product=product).order_by("sort_order", "created_at")

    def perform_create(self, serializer):
        product = self._get_product()
        serializer.save(product=product)


class PublicProductFilter(FilterSet):
    category = UUIDFilter(field_name="category__id")
    category_slug = CharFilter(field_name="category__slug")
    brand = CharFilter(field_name="brand", lookup_expr="iexact")
    min_price = NumberFilter(field_name="base_price", lookup_expr="gte")
    max_price = NumberFilter(field_name="base_price", lookup_expr="lte")
    seller = UUIDFilter(field_name="seller__id")
    availability = CharFilter(method="filter_availability")

    class Meta:
        model = Product
        fields = ["category", "category_slug", "brand", "min_price", "max_price", "seller", "availability"]

    def filter_availability(self, queryset, name, value):
        if value == "in_stock":
            return queryset.filter(variants__inventory__available_quantity__gt=0, variants__is_active=True).distinct()
        elif value == "out_of_stock":
            in_stock_products = Product.objects.filter(variants__inventory__available_quantity__gt=0, variants__is_active=True)
            return queryset.exclude(id__in=in_stock_products).distinct()
        return queryset


class PublicProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for product listings.
    GET /api/v1/products/
    GET /api/v1/products/{slug}/
    """
    permission_classes = []
    serializer_class = PublicProductListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PublicProductFilter
    search_fields = ["name", "brand", "description", "category__name", "seller__store_name"]
    lookup_field = "slug"
    ordering_fields = ["created_at", "base_price", "rating", "popularity", "sales_count"]

    def get_queryset(self):
        return Product.objects.filter(
            status="ACTIVE",
            approval_status="APPROVED",
            seller__status="APPROVED",
            variants__is_active=True
        ).prefetch_related("images", "variants").distinct()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PublicProductDetailSerializer
        return PublicProductListSerializer


