"""
Comprehensive tests for Product Management (apps/catalog).

Tests cover:
 - CRUD operations
 - Slug uniqueness validation
 - Seller isolation (cannot access other sellers' products)
 - Submit workflow (DRAFT/REJECTED → PENDING)
 - Admin approval and rejection
 - Permission checks (buyer, unauthenticated)
 - Seller login fix (covered via token-based auth helpers)
"""
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.constants import RoleType
from apps.accounts.models import Role, SellerProfile, BuyerProfile, UserRole
from apps.catalog.models import Category, Product, ProductAttribute, ProductAttributeValue, ProductVariant

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _make_user(phone, email, role_name, password="TestPassword123", **extra):
    user = User.objects.create_user(
        phone=phone, email=email, password=password,
        first_name="Test", last_name="User", is_verified=True, **extra
    )
    role = Role.objects.get(name=role_name)
    UserRole.objects.create(user=user, role=role, is_primary=True)
    return user


def _make_seller(phone, email, biz_name="My Store"):
    user = _make_user(phone, email, RoleType.SELLER.value)
    profile = SellerProfile.objects.create(
        user=user, business_name=biz_name,
        gst_number=f"GST{phone}", pan_number=f"PAN{phone}",
        status="APPROVED",
    )
    return user, profile


def _make_admin(phone, email):
    return _make_user(phone, email, RoleType.ADMIN.value)


def _login(client, phone, password="TestPassword123"):
    resp = client.post(reverse("auth_login"), {"phone": phone, "password": password}, format="json")
    assert resp.status_code == 200, f"Login failed for {phone}: {resp.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return resp.data


class BaseProductTestCase(APITestCase):
    """Shared setup for all product tests."""

    def setUp(self):
        call_command("seed_roles")
        call_command("seed_categories")
        self.client = APIClient()
        self.category = Category.objects.first()

        self.seller_user, self.seller_profile = _make_seller("9111111111", "seller1@test.com", "Store One")
        self.seller2_user, self.seller2_profile = _make_seller("9111111112", "seller2@test.com", "Store Two")
        self.admin_user = _make_admin("9000000099", "admin@test.com")

    def _product_data(self, name="Test Widget", extra=None):
        data = {
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "description": "A quality test product",
            "brand": "BrandX",
            "category": str(self.category.id),
            "base_price": "299.00",
            "compare_at_price": "399.00",
            "tax_percentage": "18.00",
            "shipping_charge": "40.00",
            "returnable": True,
            "return_window_days": 7,
            "status": "DRAFT",
        }
        if extra:
            data.update(extra)
        return data

    def _create_product(self, profile, name="Test Widget", **kwargs):
        """Directly create a product in the DB for a given seller profile."""
        return Product.objects.create(
            seller=profile,
            category=self.category,
            name=name,
            slug=name.lower().replace(" ", "-"),
            description="A quality product",
            brand="BrandX",
            base_price="299.00",
            tax_percentage="18.00",
            shipping_charge="40.00",
            **kwargs,
        )


# ─────────────────────────────────────────────────────────────────────────────
# 1. SELLER LOGIN (fixes)
# ─────────────────────────────────────────────────────────────────────────────

class SellerLoginFixTests(APITestCase):
    """Verify seller login flow works end-to-end."""

    def setUp(self):
        call_command("seed_roles")
        self.client = APIClient()
        self.seller_user, _ = _make_seller("9200000001", "loginfix@test.com")

    def test_seller_login_returns_tokens(self):
        resp = self.client.post(
            reverse("auth_login"),
            {"phone": "9200000001", "password": "TestPassword123"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertEqual(resp.data["user"]["role"], "SELLER")

    def test_seller_login_wrong_password_fails(self):
        resp = self.client.post(
            reverse("auth_login"),
            {"phone": "9200000001", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_token_grants_product_list_access(self):
        call_command("seed_categories")
        _login(self.client, "9200000001")
        resp = self.client.get("/api/v1/seller/products/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# 2. CREATE / UPDATE / DELETE
# ─────────────────────────────────────────────────────────────────────────────

class ProductCRUDTests(BaseProductTestCase):

    def test_seller_can_create_product(self):
        _login(self.client, "9111111111")
        resp = self.client.post("/api/v1/seller/products/", self._product_data(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["name"], "Test Widget")
        # Seller must be assigned automatically — never from frontend
        product = Product.objects.get(pk=resp.data["id"])
        self.assertEqual(product.seller, self.seller_profile)

    def test_seller_id_from_frontend_is_ignored(self):
        """Seller must be auto-assigned from request.user, never from submitted data."""
        _login(self.client, "9111111111")
        data = self._product_data()
        data["seller"] = str(self.seller2_profile.id)  # attacker tries to hijack
        resp = self.client.post("/api/v1/seller/products/", data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(pk=resp.data["id"])
        self.assertEqual(product.seller, self.seller_profile)  # must still be seller 1

    def test_seller_can_update_own_product(self):
        product = self._create_product(self.seller_profile)
        _login(self.client, "9111111111")
        resp = self.client.patch(
            f"/api/v1/seller/products/{product.id}/",
            {"name": "Updated Widget"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.name, "Updated Widget")

    def test_seller_can_delete_own_product(self):
        product = self._create_product(self.seller_profile)
        _login(self.client, "9111111111")
        resp = self.client.delete(f"/api/v1/seller/products/{product.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(pk=product.id).exists())

    def test_seller_can_list_own_products(self):
        self._create_product(self.seller_profile, name="P1")
        self._create_product(self.seller_profile, name="P2")
        self._create_product(self.seller2_profile, name="P3 (other seller)")
        _login(self.client, "9111111111")
        resp = self.client.get("/api/v1/seller/products/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [p["name"] for p in resp.data["results"]]
        self.assertIn("P1", names)
        self.assertIn("P2", names)
        self.assertNotIn("P3 (other seller)", names)


# ─────────────────────────────────────────────────────────────────────────────
# 3. VALIDATION — DUPLICATE SLUG
# ─────────────────────────────────────────────────────────────────────────────

class SlugValidationTests(BaseProductTestCase):

    def test_duplicate_slug_is_rejected(self):
        # Create a product with a specific slug
        Product.objects.create(
            seller=self.seller_profile, category=self.category,
            name="Widget Pro", slug="widget-pro", description="desc",
            brand="BrandX", base_price="299.00",
            tax_percentage="18.00", shipping_charge="40.00",
        )
        _login(self.client, "9111111111")
        data = self._product_data("Widget Pro B")
        data["slug"] = "widget-pro"  # same slug → must be rejected
        resp = self.client.post("/api/v1/seller/products/", data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("slug", resp.data)

    def test_compare_price_below_base_price_rejected(self):
        _login(self.client, "9111111111")
        data = self._product_data()
        data["base_price"] = "500.00"
        data["compare_at_price"] = "300.00"  # less than base
        resp = self.client.post("/api/v1/seller/products/", data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("compare_at_price", resp.data)


# ─────────────────────────────────────────────────────────────────────────────
# 4. SELLER ISOLATION
# ─────────────────────────────────────────────────────────────────────────────

class SellerIsolationTests(BaseProductTestCase):

    def test_seller_cannot_view_other_sellers_product(self):
        product = self._create_product(self.seller2_profile, name="Seller2 Product")
        _login(self.client, "9111111111")
        resp = self.client.get(f"/api/v1/seller/products/{product.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_seller_cannot_edit_other_sellers_product(self):
        product = self._create_product(self.seller2_profile, name="Seller2 Product")
        _login(self.client, "9111111111")
        resp = self.client.patch(
            f"/api/v1/seller/products/{product.id}/",
            {"name": "Hacked Name"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_seller_cannot_delete_other_sellers_product(self):
        product = self._create_product(self.seller2_profile, name="Seller2 Product")
        _login(self.client, "9111111111")
        resp = self.client.delete(f"/api/v1/seller/products/{product.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────────────────────────────────────
# 5. SUBMISSION WORKFLOW
# ─────────────────────────────────────────────────────────────────────────────

class ProductSubmissionTests(BaseProductTestCase):

    def test_seller_can_submit_draft_product(self):
        product = self._create_product(self.seller_profile, approval_status="PENDING")
        # Reset to a fresh DRAFT-like state to test submission
        product.approval_status = "REJECTED"
        product.save()
        _login(self.client, "9111111111")
        resp = self.client.post(f"/api/v1/seller/products/{product.id}/submit/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.approval_status, "PENDING")

    def test_seller_cannot_submit_already_pending_product(self):
        product = self._create_product(self.seller_profile, approval_status="PENDING")
        _login(self.client, "9111111111")
        resp = self.client.post(f"/api/v1/seller/products/{product.id}/submit/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_submit_already_approved_product(self):
        product = self._create_product(self.seller_profile, approval_status="APPROVED")
        _login(self.client, "9111111111")
        resp = self.client.post(f"/api/v1/seller/products/{product.id}/submit/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_self_approve(self):
        """Seller must never be able to change approval_status to APPROVED directly."""
        product = self._create_product(self.seller_profile)
        _login(self.client, "9111111111")
        resp = self.client.patch(
            f"/api/v1/seller/products/{product.id}/",
            {"approval_status": "APPROVED"},
            format="json",
        )
        # Either succeeds but ignores the field (read_only), or 200 OK with unchanged value
        product.refresh_from_db()
        self.assertNotEqual(product.approval_status, "APPROVED")


# ─────────────────────────────────────────────────────────────────────────────
# 6. ADMIN APPROVAL / REJECTION
# ─────────────────────────────────────────────────────────────────────────────

class AdminProductApprovalTests(BaseProductTestCase):

    def test_admin_can_list_pending_products(self):
        self._create_product(self.seller_profile, approval_status="PENDING")
        self._create_product(self.seller_profile, name="P2", approval_status="APPROVED")
        _login(self.client, "9000000099")
        resp = self.client.get("/api/v1/admin/products/pending/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for item in resp.data["results"]:
            self.assertEqual(item["approval_status"], "PENDING")

    def test_admin_can_approve_product(self):
        product = self._create_product(self.seller_profile, approval_status="PENDING")
        _login(self.client, "9000000099")
        resp = self.client.post(f"/api/v1/admin/products/{product.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.approval_status, "APPROVED")
        self.assertEqual(product.status, "ACTIVE")

    def test_admin_can_reject_product_with_reason(self):
        product = self._create_product(self.seller_profile, approval_status="PENDING")
        _login(self.client, "9000000099")
        resp = self.client.post(
            f"/api/v1/admin/products/{product.id}/reject/",
            {"rejection_reason": "Images are missing from the listing"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.approval_status, "REJECTED")
        self.assertEqual(product.rejection_reason, "Images are missing from the listing")
        self.assertEqual(product.status, "INACTIVE")

    def test_admin_reject_requires_reason(self):
        product = self._create_product(self.seller_profile, approval_status="PENDING")
        _login(self.client, "9000000099")
        resp = self.client.post(
            f"/api/v1/admin/products/{product.id}/reject/",
            {},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rejection_reason", resp.data)

    def test_admin_cannot_approve_already_approved(self):
        product = self._create_product(self.seller_profile, approval_status="APPROVED")
        _login(self.client, "9000000099")
        resp = self.client.post(f"/api/v1/admin/products/{product.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# 7. PERMISSIONS
# ─────────────────────────────────────────────────────────────────────────────

class PermissionTests(BaseProductTestCase):

    def setUp(self):
        super().setUp()
        self.buyer_user = _make_user("9300000001", "buyer@test.com", RoleType.BUYER.value)

    def test_buyer_cannot_access_seller_products(self):
        _login(self.client, "9300000001")
        resp = self.client.get("/api/v1/seller/products/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_buyer_cannot_access_admin_products(self):
        _login(self.client, "9300000001")
        resp = self.client.get("/api/v1/admin/products/pending/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_access_admin_product_endpoints(self):
        product = self._create_product(self.seller_profile, approval_status="PENDING")
        _login(self.client, "9111111111")
        resp = self.client.post(f"/api/v1/admin/products/{product.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_access_products(self):
        resp = self.client.get("/api/v1/seller/products/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_categories_accessible_to_seller(self):
        _login(self.client, "9111111111")
        resp = self.client.get("/api/v1/categories/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreater(len(resp.data), 0)


# ─────────────────────────────────────────────────────────────────────────────
# 8. FILTERING & SEARCH
# ─────────────────────────────────────────────────────────────────────────────

class ProductFilterTests(BaseProductTestCase):

    def test_filter_by_status(self):
        self._create_product(self.seller_profile, name="Draft P", status="DRAFT")
        self._create_product(self.seller_profile, name="Active P", status="ACTIVE")
        _login(self.client, "9111111111")
        resp = self.client.get("/api/v1/seller/products/?status=DRAFT")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for p in resp.data["results"]:
            self.assertEqual(p["status"], "DRAFT")

    def test_filter_by_approval_status(self):
        self._create_product(self.seller_profile, approval_status="PENDING")
        self._create_product(self.seller_profile, name="Approved P", approval_status="APPROVED")
        _login(self.client, "9111111111")
        resp = self.client.get("/api/v1/seller/products/?approval_status=PENDING")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for p in resp.data["results"]:
            self.assertEqual(p["approval_status"], "PENDING")

    def test_search_by_name(self):
        self._create_product(self.seller_profile, name="Unique Gadget")
        self._create_product(self.seller_profile, name="Another Thing")
        _login(self.client, "9111111111")
        resp = self.client.get("/api/v1/seller/products/?search=Unique+Gadget")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 1)
        self.assertEqual(resp.data["results"][0]["name"], "Unique Gadget")


class CategoryManagementTests(APITestCase):
    def setUp(self):
        # Create users
        self.super_admin, _ = User.objects.get_or_create(phone="9000000001", defaults={"email": "sa@demo.local"})
        self.super_admin.set_password("Demo@1234")
        self.super_admin.save()
        sa_role, _ = Role.objects.get_or_create(name="SUPER_ADMIN")
        UserRole.objects.get_or_create(user=self.super_admin, role=sa_role, is_primary=True)

        self.buyer, _ = User.objects.get_or_create(phone="9000000201", defaults={"email": "b1@demo.local"})
        self.buyer.set_password("Demo@1234")
        self.buyer.save()
        b_role, _ = Role.objects.get_or_create(name="BUYER")
        UserRole.objects.get_or_create(user=self.buyer, role=b_role, is_primary=True)
        BuyerProfile.objects.get_or_create(user=self.buyer)

        # Get tokens
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9000000001", "password": "Demo@1234"})
        self.admin_token = resp.data["access"]
        
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9000000201", "password": "Demo@1234"})
        self.buyer_token = resp.data["access"]

    def test_admin_can_create_category(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        data = {"name": "Test Category", "is_active": True}
        response = self.client.post("/api/v1/admin/categories/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Category.objects.count(), 1)
        self.assertEqual(Category.objects.first().slug, "test-category")

    def test_circular_hierarchy_prevented(self):
        cat1 = Category.objects.create(name="Cat 1")
        cat2 = Category.objects.create(name="Cat 2", parent=cat1)
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        response = self.client.patch(f"/api/v1/admin/categories/{cat1.id}/", {"parent": str(cat2.id)})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_safe_deletion(self):
        cat1 = Category.objects.create(name="Cat 1")
        Category.objects.create(name="Cat 2", parent=cat1)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        response = self.client.delete(f"/api/v1/admin/categories/{cat1.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        
    def test_public_api_only_shows_active(self):
        cat1 = Category.objects.create(name="Active Cat", is_active=True)
        cat2 = Category.objects.create(name="Inactive Cat", is_active=False)

        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return the active one
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(cat1.id))


class ProductVariantTests(APITestCase):
    """Tests for Product Attributes and Variants."""

    def setUp(self):
        # ── Seller A (owns the products we test)
        self.sellerA_user, _ = User.objects.get_or_create(phone="9100000001", defaults={"email": "sellerA@demo.local"})
        self.sellerA_user.set_password("Demo@1234")
        self.sellerA_user.save()
        role_seller, _ = Role.objects.get_or_create(name="SELLER")
        UserRole.objects.get_or_create(user=self.sellerA_user, role=role_seller, is_primary=True)
        self.sellerA_profile, _ = SellerProfile.objects.get_or_create(
            user=self.sellerA_user,
            defaults={"store_name": "Seller A Store", "pan_number": "ABCDE1234A", "gst_number": "27ABCDE1234A1Z5"}
        )

        # ── Seller B (isolation tests)
        self.sellerB_user, _ = User.objects.get_or_create(phone="9100000002", defaults={"email": "sellerB@demo.local"})
        self.sellerB_user.set_password("Demo@1234")
        self.sellerB_user.save()
        UserRole.objects.get_or_create(user=self.sellerB_user, role=role_seller, is_primary=True)
        self.sellerB_profile, _ = SellerProfile.objects.get_or_create(
            user=self.sellerB_user,
            defaults={"store_name": "Seller B Store", "pan_number": "FGHIJ5678B", "gst_number": "27FGHIJ5678B1Z5"}
        )

        # ── Buyer
        self.buyer_user, _ = User.objects.get_or_create(phone="9100000003", defaults={"email": "buyer1@demo.local"})
        self.buyer_user.set_password("Demo@1234")
        self.buyer_user.save()
        role_buyer, _ = Role.objects.get_or_create(name="BUYER")
        UserRole.objects.get_or_create(user=self.buyer_user, role=role_buyer, is_primary=True)
        BuyerProfile.objects.get_or_create(user=self.buyer_user)

        # ── Product for Seller A
        self.category = Category.objects.create(name="Variant Test Category", slug="variant-test-cat")
        self.product = Product.objects.create(
            seller=self.sellerA_profile,
            category=self.category,
            name="Women's Kurti",
            slug="womens-kurti-vartest",
            description="A beautiful kurti.",
            brand="BIBA",
            base_price="499.00",
            tax_percentage="5",
            shipping_charge="0",
        )

        # Tokens
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9100000001", "password": "Demo@1234"})
        self.tokenA = resp.data["access"]
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9100000002", "password": "Demo@1234"})
        self.tokenB = resp.data["access"]
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9100000003", "password": "Demo@1234"})
        self.tokenBuyer = resp.data["access"]

        self.attr_url = f"/api/v1/seller/products/{self.product.id}/attributes/"
        self.variant_url = f"/api/v1/seller/products/{self.product.id}/variants/"

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # ── Attribute tests ──────────────────────────────────────────────────────

    def test_create_attribute(self):
        self._auth(self.tokenA)
        res = self.client.post(self.attr_url, {"name": "Color"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProductAttribute.objects.filter(product=self.product).count(), 1)

    def test_duplicate_attribute_name_rejected(self):
        self._auth(self.tokenA)
        self.client.post(self.attr_url, {"name": "Color"})
        res = self.client.post(self.attr_url, {"name": "Color"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_B_cannot_see_seller_A_attributes(self):
        ProductAttribute.objects.create(product=self.product, name="Size")
        self._auth(self.tokenB)
        res = self.client.get(self.attr_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_buyer_cannot_access_attributes(self):
        self._auth(self.tokenBuyer)
        res = self.client.get(self.attr_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ── Variant tests ────────────────────────────────────────────────────────

    def test_create_variant_with_attributes(self):
        self._auth(self.tokenA)
        attr = ProductAttribute.objects.create(product=self.product, name="Color")
        av_red = ProductAttributeValue.objects.create(attribute=attr, value="Red")
        res = self.client.post(self.variant_url, {
            "sku": "TEST-SKU-001",
            "price": "499.00",
            "attribute_values": [str(av_red.id)],
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["sku"], "TEST-SKU-001")

    def test_duplicate_sku_rejected(self):
        self._auth(self.tokenA)
        attr = ProductAttribute.objects.create(product=self.product, name="Size")
        av_s = ProductAttributeValue.objects.create(attribute=attr, value="S")
        av_m = ProductAttributeValue.objects.create(attribute=attr, value="M")
        self.client.post(self.variant_url, {"sku": "DUPE-SKU", "price": "499", "attribute_values": [str(av_s.id)]}, format="json")
        res = self.client.post(self.variant_url, {"sku": "DUPE-SKU", "price": "499", "attribute_values": [str(av_m.id)]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sku", res.data)

    def test_duplicate_combination_rejected(self):
        self._auth(self.tokenA)
        attr = ProductAttribute.objects.create(product=self.product, name="Color")
        av_red = ProductAttributeValue.objects.create(attribute=attr, value="Red")
        # Create first variant
        self.client.post(self.variant_url, {"sku": "COMBO-SKU-001", "price": "499", "attribute_values": [str(av_red.id)]}, format="json")
        # Create second with same attribute values
        res = self.client.post(self.variant_url, {"sku": "COMBO-SKU-002", "price": "599", "attribute_values": [str(av_red.id)]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_isolation_variants(self):
        self._auth(self.tokenB)
        res = self.client.get(self.variant_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_generate_variants_cartesian_product(self):
        self._auth(self.tokenA)
        attr_color = ProductAttribute.objects.create(product=self.product, name="Color")
        attr_size = ProductAttribute.objects.create(product=self.product, name="Size")
        av_red = ProductAttributeValue.objects.create(attribute=attr_color, value="Red")
        av_blue = ProductAttributeValue.objects.create(attribute=attr_color, value="Blue")
        av_s = ProductAttributeValue.objects.create(attribute=attr_size, value="S")
        av_m = ProductAttributeValue.objects.create(attribute=attr_size, value="M")

        res = self.client.post(
            f"/api/v1/seller/products/{self.product.id}/variants/generate/",
            {
                "base_price": "499",
                "sku_prefix": "KURTI",
                "attribute_value_groups": [[str(av_red.id), str(av_blue.id)], [str(av_s.id), str(av_m.id)]],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # 2 colors × 2 sizes = 4 variants
        self.assertEqual(res.data["created"], 4)
        self.assertEqual(ProductVariant.objects.filter(product=self.product).count(), 4)

    def test_generate_skips_duplicate_combos(self):
        self._auth(self.tokenA)
        attr_color = ProductAttribute.objects.create(product=self.product, name="Fabric")
        av_cotton = ProductAttributeValue.objects.create(attribute=attr_color, value="Cotton")
        # Pre-create the same variant
        existing = ProductVariant.objects.create(product=self.product, sku="PRE-COTTON", price="499")
        existing.attribute_values.set([av_cotton])

        res = self.client.post(
            f"/api/v1/seller/products/{self.product.id}/variants/generate/",
            {"base_price": "499", "attribute_value_groups": [[str(av_cotton.id)]]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["created"], 0)
        self.assertEqual(res.data["skipped"], 1)


class ProductImageTests(APITestCase):
    """Tests for Product Image Uploads & Management."""

    def setUp(self):
        # Create users
        from apps.accounts.models import Role, UserRole, SellerProfile
        self.sellerA_user, _ = User.objects.get_or_create(phone="9100000001", defaults={"email": "sellerA@demo.local"})
        self.sellerA_user.set_password("Demo@1234")
        self.sellerA_user.save()
        role_seller, _ = Role.objects.get_or_create(name="SELLER")
        UserRole.objects.get_or_create(user=self.sellerA_user, role=role_seller, is_primary=True)
        self.sellerA_profile, _ = SellerProfile.objects.get_or_create(
            user=self.sellerA_user,
            defaults={"store_name": "Seller A Store", "pan_number": "ABCDE1234A", "gst_number": "27ABCDE1234A1Z5"}
        )

        self.sellerB_user, _ = User.objects.get_or_create(phone="9100000002", defaults={"email": "sellerB@demo.local"})
        self.sellerB_user.set_password("Demo@1234")
        self.sellerB_user.save()
        UserRole.objects.get_or_create(user=self.sellerB_user, role=role_seller, is_primary=True)
        self.sellerB_profile, _ = SellerProfile.objects.get_or_create(
            user=self.sellerB_user,
            defaults={"store_name": "Seller B Store", "pan_number": "FGHIJ5678B", "gst_number": "27FGHIJ5678B1Z5"}
        )

        self.category = Category.objects.create(name="Image Test Category", slug="image-test-cat")
        self.product = Product.objects.create(
            seller=self.sellerA_profile,
            category=self.category,
            name="Test Kurti",
            slug="test-kurti-image",
            description="A kurti.",
            brand="BIBA",
            base_price="499.00",
            tax_percentage="5",
            shipping_charge="0",
        )

        resp = self.client.post("/api/v1/auth/login/", {"phone": "9100000001", "password": "Demo@1234"})
        self.tokenA = resp.data["access"]
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9100000002", "password": "Demo@1234"})
        self.tokenB = resp.data["access"]

        self.image_url = f"/api/v1/seller/products/{self.product.id}/images/"

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_seller_can_upload_product_image(self):
        self._auth(self.tokenA)
        from django.core.files.uploadedfile import SimpleUploadedFile
        # 1x1 black gif
        small_gif = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00'
            b'\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00'
            b'\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
        )
        uploaded_image = SimpleUploadedFile("small.png", small_gif, content_type="image/png")
        
        res = self.client.post(self.image_url, {"image": uploaded_image, "alt_text": "kurti look"}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.product.images.count(), 1)
        self.assertTrue(self.product.images.first().is_primary)

    def test_seller_cannot_upload_invalid_file_format(self):
        self._auth(self.tokenA)
        from django.core.files.uploadedfile import SimpleUploadedFile
        bad_file = SimpleUploadedFile("bad.txt", b"not-an-image-binary", content_type="text/plain")
        res = self.client.post(self.image_url, {"image": bad_file}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_isolation_on_image_uploads(self):
        self._auth(self.tokenB)
        from django.core.files.uploadedfile import SimpleUploadedFile
        small_gif = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00'
            b'\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00'
            b'\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
        )
        uploaded_image = SimpleUploadedFile("small.png", small_gif, content_type="image/png")
        
        res = self.client.post(self.image_url, {"image": uploaded_image}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_primary_image_assignment_rules(self):
        self._auth(self.tokenA)
        from apps.catalog.models import ProductImage
        img1 = ProductImage.objects.create(product=self.product, image="products/img1.png", is_primary=False)
        self.assertTrue(img1.is_primary)

        img2 = ProductImage.objects.create(product=self.product, image="products/img2.png", is_primary=True)
        self.assertTrue(img2.is_primary)
        
        img1.refresh_from_db()
        self.assertFalse(img1.is_primary)

    def test_delete_primary_image_reassigns_primary(self):
        self._auth(self.tokenA)
        from apps.catalog.models import ProductImage
        img1 = ProductImage.objects.create(product=self.product, image="products/img1.png", is_primary=True)
        img2 = ProductImage.objects.create(product=self.product, image="products/img2.png", is_primary=False)
        
        self.assertTrue(img1.is_primary)
        self.assertFalse(img2.is_primary)

        img1.delete()
        
        img2.refresh_from_db()
        self.assertTrue(img2.is_primary)


class PublicProductCatalogTests(APITestCase):
    """Tests public product listing queries, search filters, sorting, and visibility rules."""

    def setUp(self):
        from apps.accounts.models import Role, UserRole, SellerProfile
        
        # Approved Seller
        self.sellerA_user, _ = User.objects.get_or_create(phone="9300000001", defaults={"email": "sellerA@demo.local"})
        self.sellerA_user.set_password("Demo@1234")
        self.sellerA_user.save()
        role_seller, _ = Role.objects.get_or_create(name="SELLER")
        UserRole.objects.get_or_create(user=self.sellerA_user, role=role_seller, is_primary=True)
        self.sellerA_profile, _ = SellerProfile.objects.get_or_create(
            user=self.sellerA_user,
            defaults={"store_name": "Seller A Store", "status": "APPROVED", "pan_number": "ABCDE1234A", "gst_number": "27ABCDE1234A1Z5"}
        )

        # Suspended/Pending Seller
        self.sellerB_user, _ = User.objects.get_or_create(phone="9300000002", defaults={"email": "sellerB@demo.local"})
        self.sellerB_user.set_password("Demo@1234")
        self.sellerB_user.save()
        UserRole.objects.get_or_create(user=self.sellerB_user, role=role_seller, is_primary=True)
        self.sellerB_profile, _ = SellerProfile.objects.get_or_create(
            user=self.sellerB_user,
            defaults={"store_name": "Seller B Store", "status": "PENDING", "pan_number": "FGHIJ5678B", "gst_number": "27FGHIJ5678B1Z5"}
        )

        self.category = Category.objects.create(name="Test Category", slug="test-cat")

        # Visible Product
        self.prod_visible = Product.objects.create(
            seller=self.sellerA_profile,
            category=self.category,
            name="Visible Premium T-Shirt",
            slug="visible-premium-tshirt",
            brand="TrendVibe",
            base_price=Decimal("499.00"),
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
            status="ACTIVE",
            approval_status="APPROVED"
        )
        ProductVariant.objects.create(product=self.prod_visible, sku="SHIRT-VIS-M", price=Decimal("499.00"), is_active=True)

        # Invisible: Draft status
        self.prod_draft = Product.objects.create(
            seller=self.sellerA_profile,
            category=self.category,
            name="Draft T-Shirt",
            slug="draft-tshirt",
            brand="TrendVibe",
            base_price=Decimal("299.00"),
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
            status="DRAFT",
            approval_status="APPROVED"
        )
        ProductVariant.objects.create(product=self.prod_draft, sku="SHIRT-DRAFT-M", price=Decimal("299.00"), is_active=True)

        # Invisible: Pending approval status
        self.prod_pending = Product.objects.create(
            seller=self.sellerA_profile,
            category=self.category,
            name="Pending T-Shirt",
            slug="pending-tshirt",
            brand="TrendVibe",
            base_price=Decimal("399.00"),
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
            status="ACTIVE",
            approval_status="PENDING"
        )
        ProductVariant.objects.create(product=self.prod_pending, sku="SHIRT-PEND-M", price=Decimal("399.00"), is_active=True)

        # Invisible: Seller is pending approval
        self.prod_bad_seller = Product.objects.create(
            seller=self.sellerB_profile,
            category=self.category,
            name="Bad Seller T-Shirt",
            slug="bad-seller-tshirt",
            brand="TrendVibe",
            base_price=Decimal("199.00"),
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
            status="ACTIVE",
            approval_status="APPROVED"
        )
        ProductVariant.objects.create(product=self.prod_bad_seller, sku="SHIRT-BAD-M", price=Decimal("199.00"), is_active=True)

        # Invisible: No active variants
        self.prod_no_variants = Product.objects.create(
            seller=self.sellerA_profile,
            category=self.category,
            name="No Variant T-Shirt",
            slug="no-variant-tshirt",
            brand="TrendVibe",
            base_price=Decimal("699.00"),
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
            status="ACTIVE",
            approval_status="APPROVED"
        )
        ProductVariant.objects.create(product=self.prod_no_variants, sku="SHIRT-NONE-M", price=Decimal("699.00"), is_active=False)

    def test_public_product_list_visibility_rules(self):
        res = self.client.get("/api/v1/products/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should only list the visible product (1 item)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], str(self.prod_visible.id))

    def test_public_product_retrieve(self):
        # Retrieve visible product should work
        res = self.client.get(f"/api/v1/products/{self.prod_visible.slug}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Visible Premium T-Shirt")

        # Retrieve draft product should fail/404
        res = self.client.get(f"/api/v1/products/{self.prod_draft.slug}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_search_and_sorting(self):
        # Create second visible product for sorting tests
        prod_visible_2 = Product.objects.create(
            seller=self.sellerA_profile,
            category=self.category,
            name="Another Visible Kurti",
            slug="another-visible-kurti",
            brand="StyleVibe",
            base_price=Decimal("999.00"),
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
            status="ACTIVE",
            approval_status="APPROVED"
        )
        ProductVariant.objects.create(product=prod_visible_2, sku="KURTI-VIS-M", price=Decimal("999.00"), is_active=True)

        # Test search query
        res = self.client.get("/api/v1/products/?search=Kurti")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["name"], "Another Visible Kurti")

        # Test sorting low to high
        res = self.client.get("/api/v1/products/?ordering=base_price")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["results"][0]["base_price"], "499.00")
        self.assertEqual(res.data["results"][1]["base_price"], "999.00")

        # Test sorting high to low
        res = self.client.get("/api/v1/products/?ordering=-base_price")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["results"][0]["base_price"], "999.00")
        self.assertEqual(res.data["results"][1]["base_price"], "499.00")


