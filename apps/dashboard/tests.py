from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.accounts.models import Role, UserRole, SellerProfile, BuyerProfile, AdminProfile

User = get_user_model()


class DashboardPermissionTests(APITestCase):

    def setUp(self):
        self.role_sa, _ = Role.objects.get_or_create(name='SUPER_ADMIN')
        self.role_admin, _ = Role.objects.get_or_create(name='ADMIN')
        self.role_seller, _ = Role.objects.get_or_create(name='SELLER')
        self.role_buyer, _ = Role.objects.get_or_create(name='BUYER')

        self.super_admin = User.objects.create_user(phone='9900000001', email='sa_dash@test.local', password='Pass1234', is_superuser=True, is_staff=True)
        UserRole.objects.create(user=self.super_admin, role=self.role_sa, is_primary=True)

        self.admin = User.objects.create_user(phone='9900000002', email='admin_dash@test.local', password='Pass1234', is_staff=True)
        UserRole.objects.create(user=self.admin, role=self.role_admin, is_primary=True)
        AdminProfile.objects.create(user=self.admin)

        self.seller = User.objects.create_user(phone='9900000003', email='seller_dash@test.local', password='Pass1234')
        UserRole.objects.create(user=self.seller, role=self.role_seller, is_primary=True)
        SellerProfile.objects.create(user=self.seller, store_name='Test Store', pan_number='ABCDE1234F', gst_number='27ABCDE1234F1Z5')

        self.buyer = User.objects.create_user(phone='9900000004', email='buyer_dash@test.local', password='Pass1234')
        UserRole.objects.create(user=self.buyer, role=self.role_buyer, is_primary=True)
        BuyerProfile.objects.create(user=self.buyer)

    def _token(self, phone, password):
        resp = self.client.post('/api/v1/auth/login/', {'phone': phone, 'password': password})
        return resp.data['access']

    def _auth(self, phone, password='Pass1234'):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._token(phone, password)}')

    # ── Super Admin Overview ──
    def test_super_admin_can_access_sa_overview(self):
        self._auth('9900000001')
        resp = self.client.get('/api/v1/dashboard/super-admin/overview/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', resp.data)
        self.assertIn('total_revenue', resp.data)

    def test_admin_cannot_access_sa_overview(self):
        self._auth('9900000002')
        resp = self.client.get('/api/v1/dashboard/super-admin/overview/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_access_sa_overview(self):
        self._auth('9900000003')
        resp = self.client.get('/api/v1/dashboard/super-admin/overview/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_buyer_cannot_access_sa_overview(self):
        self._auth('9900000004')
        resp = self.client.get('/api/v1/dashboard/super-admin/overview/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ── Admin Overview ──
    def test_admin_can_access_admin_overview(self):
        self._auth('9900000002')
        resp = self.client.get('/api/v1/dashboard/admin/overview/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('pending_sellers', resp.data)
        self.assertNotIn('total_revenue', resp.data)

    def test_super_admin_can_access_admin_overview(self):
        self._auth('9900000001')
        resp = self.client.get('/api/v1/dashboard/admin/overview/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_seller_cannot_access_admin_overview(self):
        self._auth('9900000003')
        resp = self.client.get('/api/v1/dashboard/admin/overview/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ── Charts ──
    def test_admin_can_access_charts(self):
        self._auth('9900000002')
        resp = self.client.get('/api/v1/dashboard/charts/?period=30d')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('daily_orders', resp.data)
        self.assertIn('seller_status', resp.data)

    def test_buyer_cannot_access_charts(self):
        self._auth('9900000004')
        resp = self.client.get('/api/v1/dashboard/charts/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
