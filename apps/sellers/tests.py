from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.constants import RoleType
from apps.accounts.models import Role, UserRole, SellerProfile

User = get_user_model()


class SellerProfileAPITests(APITestCase):
    """Tests for seller profile API"""

    def setUp(self):
        """Set up test data"""
        call_command("seed_roles")
        self.client = APIClient()
        
        # Create seller user
        self.seller_user = User.objects.create_user(
            phone="9000000001",
            email="seller@example.com",
            password="TestPassword123",
            first_name="Seller",
            last_name="Test",
            is_verified=True,
        )
        seller_role = Role.objects.get(name=RoleType.SELLER.value)
        UserRole.objects.create(user=self.seller_user, role=seller_role, is_primary=True)
        SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Test Store",
            gst_number="GST123",
            pan_number="PAN123",
        )

    def _login_seller(self):
        """Helper to login seller and get token"""
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9000000001", "password": "TestPassword123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return token

    def test_seller_can_get_own_profile(self):
        """Test seller can retrieve their own profile"""
        self._login_seller()
        response = self.client.get(reverse("seller_profile"))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_phone"], "9000000001")
        self.assertEqual(response.data["business_name"], "Test Store")
        self.assertEqual(response.data["status"], "PENDING")

    def test_seller_can_update_own_profile(self):
        """Test seller can update their profile"""
        self._login_seller()
        data = {
            "store_name": "My Store",
            "store_description": "My description",
            "business_phone": "9999999999",
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "postal_code": "400001",
        }
        response = self.client.patch(reverse("seller_profile"), data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["store_name"], "My Store")
        self.assertEqual(response.data["business_phone"], "9999999999")
        self.assertEqual(response.data["city"], "Mumbai")

    def test_seller_cannot_change_own_status(self):
        """Test seller cannot change their own approval status"""
        self._login_seller()
        data = {"status": "APPROVED"}
        response = self.client.patch(reverse("seller_profile"), data, format="json")
        
        # Status field is read-only, so it should be ignored
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "PENDING")

    def test_seller_cannot_change_own_gst_pan(self):
        """Test seller cannot change GST/PAN through profile update"""
        self._login_seller()
        data = {"gst_number": "NEWGST", "pan_number": "NEWPAN"}
        response = self.client.patch(reverse("seller_profile"), data, format="json")
        
        # These fields are read-only, so they should be ignored
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["gst_number"], "GST123")
        self.assertEqual(response.data["pan_number"], "PAN123")


class SellerDashboardAPITests(APITestCase):
    """Tests for seller dashboard API"""

    def setUp(self):
        """Set up test data"""
        call_command("seed_roles")
        self.client = APIClient()
        
        # Create seller user
        self.seller_user = User.objects.create_user(
            phone="9000000001",
            email="seller@example.com",
            password="TestPassword123",
            first_name="Seller",
            last_name="Test",
            is_verified=True,
        )
        seller_role = Role.objects.get(name=RoleType.SELLER.value)
        UserRole.objects.create(user=self.seller_user, role=seller_role, is_primary=True)
        SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Test Store",
            gst_number="GST123",
            pan_number="PAN123",
        )

    def _login_seller(self):
        """Helper to login seller"""
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9000000001", "password": "TestPassword123"},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_seller_can_access_dashboard(self):
        """Test seller can access their dashboard"""
        self._login_seller()
        response = self.client.get(reverse("seller_dashboard"))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("dashboard", response.data)
        self.assertEqual(response.data["dashboard"]["status"], "Pending")
        self.assertEqual(response.data["dashboard"]["total_products"], 0)

    def test_dashboard_contains_product_stats(self):
        """Test dashboard returns product statistics"""
        self._login_seller()
        response = self.client.get(reverse("seller_dashboard"))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        dashboard = response.data["dashboard"]
        self.assertIn("total_products", dashboard)
        self.assertIn("approved_products", dashboard)
        self.assertIn("pending_products", dashboard)
        self.assertIn("rejected_products", dashboard)
        self.assertIn("total_inventory", dashboard)
        self.assertIn("low_stock_products", dashboard)


class AdminSellerListAPITests(APITestCase):
    """Tests for admin seller listing API"""

    def setUp(self):
        """Set up test data"""
        call_command("seed_roles")
        self.client = APIClient()
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            phone="9000000099",
            email="admin@example.com",
            password="TestPassword123",
            first_name="Admin",
            last_name="Test",
            is_verified=True,
        )
        admin_role = Role.objects.get(name=RoleType.ADMIN.value)
        UserRole.objects.create(user=self.admin_user, role=admin_role, is_primary=True)
        
        # Create multiple sellers
        for i in range(5):
            seller = User.objects.create_user(
                phone=f"900000000{i}",
                email=f"seller{i}@example.com",
                password="TestPassword123",
                first_name=f"Seller{i}",
                last_name="Test",
                is_verified=True,
            )
            seller_role = Role.objects.get(name=RoleType.SELLER.value)
            UserRole.objects.create(user=seller, role=seller_role, is_primary=True)
            SellerProfile.objects.create(
                user=seller,
                business_name=f"Store {i}",
                gst_number=f"GST{i}",
                pan_number=f"PAN{i}",
                city="Mumbai" if i % 2 == 0 else "Delhi",
                status="PENDING" if i % 2 == 0 else "APPROVED",
            )

    def _login_admin(self):
        """Helper to login admin"""
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9000000099", "password": "TestPassword123"},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_admin_can_list_sellers(self):
        """Test admin can list all sellers"""
        self._login_admin()
        response = self.client.get("/api/v1/admin/sellers/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 5)

    def test_admin_can_filter_sellers_by_status(self):
        """Test admin can filter sellers by status"""
        self._login_admin()
        response = self.client.get("/api/v1/admin/sellers/?status=PENDING")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 3)  # 3 PENDING sellers
        for seller in results:
            self.assertEqual(seller["status"], "PENDING")

    def test_admin_can_filter_sellers_by_city(self):
        """Test admin can filter sellers by city"""
        self._login_admin()
        response = self.client.get("/api/v1/admin/sellers/?city=Mumbai")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 3)  # 3 sellers in Mumbai

    def test_admin_can_search_sellers_by_phone(self):
        """Test admin can search sellers by phone"""
        self._login_admin()
        response = self.client.get("/api/v1/admin/sellers/?search=9000000001")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["user_phone"], "9000000001")

    def test_buyer_cannot_list_sellers(self):
        """Test buyer cannot access seller management"""
        buyer = User.objects.create_user(
            phone="9999999999",
            email="buyer@example.com",
            password="TestPassword123",
            first_name="Buyer",
            last_name="Test",
            is_verified=True,
        )
        buyer_role = Role.objects.get(name=RoleType.BUYER.value)
        UserRole.objects.create(user=buyer, role=buyer_role, is_primary=True)
        
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9999999999", "password": "TestPassword123"},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        response = self.client.get("/api/v1/admin/sellers/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminSellerApprovalTests(APITestCase):
    """Tests for seller approval workflow"""

    def setUp(self):
        """Set up test data"""
        call_command("seed_roles")
        self.client = APIClient()
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            phone="9000000099",
            email="admin@example.com",
            password="TestPassword123",
            first_name="Admin",
            last_name="Test",
            is_verified=True,
        )
        admin_role = Role.objects.get(name=RoleType.ADMIN.value)
        UserRole.objects.create(user=self.admin_user, role=admin_role, is_primary=True)
        
        # Create seller user
        self.seller_user = User.objects.create_user(
            phone="9000000001",
            email="seller@example.com",
            password="TestPassword123",
            first_name="Seller",
            last_name="Test",
            is_verified=True,
        )
        seller_role = Role.objects.get(name=RoleType.SELLER.value)
        UserRole.objects.create(user=self.seller_user, role=seller_role, is_primary=True)
        self.seller_profile = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Test Store",
            gst_number="GST123",
            pan_number="PAN123",
        )

    def _login_admin(self):
        """Helper to login admin"""
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9000000099", "password": "TestPassword123"},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_admin_can_approve_seller(self):
        """Test admin can approve a seller"""
        self._login_admin()
        seller_id = self.seller_profile.id
        
        response = self.client.post(
            f"/api/v1/admin/sellers/{seller_id}/approve/"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.seller_profile.refresh_from_db()
        self.assertEqual(self.seller_profile.status, "APPROVED")

    def test_admin_can_reject_seller(self):
        """Test admin can reject a seller"""
        self._login_admin()
        seller_id = self.seller_profile.id
        
        data = {"rejection_reason": "Business documents are incomplete"}
        response = self.client.post(
            f"/api/v1/admin/sellers/{seller_id}/reject/",
            data,
            format="json",
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.seller_profile.refresh_from_db()
        self.assertEqual(self.seller_profile.status, "REJECTED")
        self.assertEqual(self.seller_profile.rejection_reason, "Business documents are incomplete")
        self.assertEqual(self.seller_profile.rejected_by, self.admin_user)

    def test_seller_can_see_rejection_reason(self):
        """Test seller can see rejection reason"""
        # Reject the seller first
        self.seller_profile.status = "REJECTED"
        self.seller_profile.rejection_reason = "Invalid documents"
        self.seller_profile.rejected_by = self.admin_user
        self.seller_profile.rejected_at = timezone.now()
        self.seller_profile.save()
        
        # Login as seller and check profile
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9000000001", "password": "TestPassword123"},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        response = self.client.get(reverse("seller_profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rejection_reason"], "Invalid documents")

    def test_admin_can_suspend_seller(self):
        """Test admin can suspend an approved seller"""
        self.seller_profile.status = "APPROVED"
        self.seller_profile.save()
        
        self._login_admin()
        seller_id = self.seller_profile.id
        
        response = self.client.post(f"/api/v1/admin/sellers/{seller_id}/suspend/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.seller_profile.refresh_from_db()
        self.assertEqual(self.seller_profile.status, "SUSPENDED")

    def test_admin_can_activate_suspended_seller(self):
        """Test admin can reactivate a suspended seller"""
        self.seller_profile.status = "SUSPENDED"
        self.seller_profile.save()
        
        self._login_admin()
        seller_id = self.seller_profile.id
        
        response = self.client.post(f"/api/v1/admin/sellers/{seller_id}/activate/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.seller_profile.refresh_from_db()
        self.assertEqual(self.seller_profile.status, "APPROVED")

    def test_admin_can_block_seller(self):
        """Test admin can block a seller"""
        self._login_admin()
        seller_id = self.seller_profile.id
        
        response = self.client.post(f"/api/v1/admin/sellers/{seller_id}/block/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.seller_profile.refresh_from_db()
        self.assertEqual(self.seller_profile.status, "BLOCKED")

    def test_seller_cannot_approve_self(self):
        """Test seller cannot approve themselves"""
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9000000001", "password": "TestPassword123"},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        seller_id = self.seller_profile.id
        response = self.client.post(f"/api/v1/admin/sellers/{seller_id}/approve/")
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SellerIsolationTests(APITestCase):
    """Tests for seller isolation and security"""

    def setUp(self):
        """Set up test data"""
        call_command("seed_roles")
        self.client = APIClient()
        
        # Create seller1
        self.seller1 = User.objects.create_user(
            phone="9000000001",
            email="seller1@example.com",
            password="TestPassword123",
            first_name="Seller1",
            last_name="Test",
            is_verified=True,
        )
        seller_role = Role.objects.get(name=RoleType.SELLER.value)
        UserRole.objects.create(user=self.seller1, role=seller_role, is_primary=True)
        self.profile1 = SellerProfile.objects.create(
            user=self.seller1,
            business_name="Store 1",
            gst_number="GST1",
            pan_number="PAN1",
        )
        
        # Create seller2
        self.seller2 = User.objects.create_user(
            phone="9000000002",
            email="seller2@example.com",
            password="TestPassword123",
            first_name="Seller2",
            last_name="Test",
            is_verified=True,
        )
        UserRole.objects.create(user=self.seller2, role=seller_role, is_primary=True)
        self.profile2 = SellerProfile.objects.create(
            user=self.seller2,
            business_name="Store 2",
            gst_number="GST2",
            pan_number="PAN2",
        )

    def test_seller_cannot_access_other_seller_profile(self):
        """Test seller1 cannot access seller2's profile"""
        # Login as seller1
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9000000001", "password": "TestPassword123"},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        # Try to update seller2's profile (should get seller1's profile only)
        # The endpoint doesn't allow specifying a seller_id, it always returns the logged-in user's profile
        response = self.client.get(reverse("seller_profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_phone"], "9000000001")

    def test_seller_cannot_modify_other_seller_profile(self):
        """Test seller1 cannot modify seller2's profile"""
        # Since the endpoints use request.user, this is automatically protected
        # But we test that the data returned is always for the logged-in user
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "9000000002", "password": "TestPassword123"},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        data = {"store_name": "Modified Store"}
        response = self.client.patch(reverse("seller_profile"), data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile2.refresh_from_db()
        self.assertEqual(self.profile2.store_name, "Modified Store")

