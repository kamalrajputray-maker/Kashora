from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import AdminProfile, BuyerProfile, Role

User = get_user_model()


class AuthFlowTests(APITestCase):
    def setUp(self):
        call_command("seed_roles")
        self.client = APIClient()

    def _create_super_admin(self):
        user = User.objects.create_user(
            phone="9000000001",
            email="super@example.com",
            password="StrongPassword123",
            first_name="Super",
            last_name="Admin",
            is_verified=True,
        )
        user.user_roles.filter(role__name="SUPER_ADMIN").delete()
        user.user_roles.create(role=Role.objects.get(name="SUPER_ADMIN"), is_primary=True)
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=["is_staff", "is_superuser"])
        return user

    def _login(self, user):
        data = {"phone": user.phone, "password": "StrongPassword123"}
        response = self.client.post(reverse("auth_login"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def test_buyer_registration_and_login(self):
        response = self.client.post(
            reverse("buyer_register"),
            {
                "phone": "9999999999",
                "email": "buyer@example.com",
                "password": "StrongPassword123",
                "first_name": "Buyer",
                "last_name": "User",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], "BUYER")
        self.assertTrue(User.objects.filter(phone="9999999999").exists())
        self.assertTrue(BuyerProfile.objects.filter(user__phone="9999999999").exists())

        login_response = self.client.post(
            reverse("auth_login"),
            {"phone": "9999999999", "password": "StrongPassword123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)

    def test_buyer_can_access_me_endpoint(self):
        user = User.objects.create_user(
            phone="7777777777",
            email="buyer_me@example.com",
            password="StrongPassword123",
            first_name="John",
            last_name="Doe",
            is_verified=True,
        )
        role = Role.objects.get(name="BUYER")
        user.user_roles.create(role=role, is_primary=True)

        token = self._login(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token['access']}")
        response = self.client.get(reverse("auth_me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "BUYER")
        self.assertNotIn("password", response.data)

    def test_seller_registration_sets_pending_role(self):
        response = self.client.post(
            reverse("seller_register"),
            {
                "phone": "8888888888",
                "email": "seller@example.com",
                "password": "StrongPassword123",
                "first_name": "Seller",
                "last_name": "User",
                "business_name": "ABC Store",
                "gst_number": "GST_NUMBER",
                "pan_number": "PAN_NUMBER",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(phone="8888888888")
        self.assertEqual(user.role, "SELLER")
        self.assertEqual(user.seller_profile.seller_status, "PENDING")

    def test_public_user_cannot_create_admin(self):
        buyer = User.objects.create_user(
            phone="1111111111",
            email="notadmin@example.com",
            password="StrongPassword123",
            first_name="Normal",
            last_name="User",
            is_verified=True,
        )
        user_role = Role.objects.get(name="BUYER")
        buyer.user_roles.create(role=user_role, is_primary=True)

        token = self._login(buyer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token['access']}")
        response = self.client.post(
            reverse("admin_list_create"),
            {
                "phone": "9999999998",
                "email": "admin@example.com",
                "first_name": "Admin",
                "last_name": "User",
                "password": "StrongPassword123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_can_create_admin(self):
        super_admin = self._create_super_admin()
        login = self._login(super_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login['access']}")

        response = self.client.post(
            reverse("admin_list_create"),
            {
                "phone": "2222222222",
                "email": "newadmin@example.com",
                "first_name": "Admin",
                "last_name": "User",
                "password": "StrongPassword123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "ADMIN")
        self.assertTrue(AdminProfile.objects.filter(user__phone="2222222222").exists())

    def test_duplicate_phone_and_email_are_rejected(self):
        self.client.post(
            reverse("buyer_register"),
            {
                "phone": "3333333333",
                "email": "dup@example.com",
                "password": "StrongPassword123",
                "first_name": "Buyer",
                "last_name": "User",
            },
            format="json",
        )

        response = self.client.post(
            reverse("buyer_register"),
            {
                "phone": "3333333333",
                "email": "another@example.com",
                "password": "StrongPassword123",
                "first_name": "Buyer",
                "last_name": "User",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            reverse("buyer_register"),
            {
                "phone": "4444444444",
                "email": "dup@example.com",
                "password": "StrongPassword123",
                "first_name": "Buyer",
                "last_name": "User",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_login_and_private_role_assignment_rejected(self):
        response = self.client.post(
            reverse("auth_login"),
            {"phone": "missing-user", "password": "StrongPassword123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(
            reverse("buyer_register"),
            {
                "phone": "5555555555",
                "email": "role_test@example.com",
                "password": "StrongPassword123",
                "first_name": "Buyer",
                "last_name": "User",
                "role": "SUPER_ADMIN",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(phone="5555555555").role, "BUYER")

    def test_super_admin_and_public_auth_endpoints_work(self):
        super_admin = self._create_super_admin()
        login_data = self._login(super_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_data['access']}")
        self.assertEqual(self.client.get(reverse("auth_me")).status_code, status.HTTP_200_OK)

        refresh_response = self.client.post(
            reverse("token_refresh"),
            {"refresh": login_data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)
