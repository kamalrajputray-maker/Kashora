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
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.constants import RoleType
from apps.accounts.models import Role, SellerProfile, UserRole
from apps.catalog.models import Category, Product

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
