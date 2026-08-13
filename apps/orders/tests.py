from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, UserRole, SellerProfile, BuyerProfile
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import Inventory
from apps.cart.models import Cart, CartItem
from apps.orders.models import Order, OrderItem

from django.contrib.auth import get_user_model
User = get_user_model()


CHECKOUT_PAYLOAD = {
    "payment_method": "COD",
    "shipping_address": {
        "full_name": "Test Buyer",
        "phone": "9876543210",
        "line1": "123 Test Street",
        "line2": "Near Park",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
    },
    "notes": "Please pack carefully"
}


class OrderCheckoutTests(APITestCase):

    def setUp(self):
        self.role_buyer, _ = Role.objects.get_or_create(name="BUYER")
        self.role_seller, _ = Role.objects.get_or_create(name="SELLER")

        self.buyer = User.objects.create_user(phone="9000000201", email="buyer2@demo.local", password="Password123")
        UserRole.objects.create(user=self.buyer, role=self.role_buyer, is_primary=True)
        BuyerProfile.objects.create(user=self.buyer)

        self.seller_user = User.objects.create_user(phone="9000000202", email="seller2@demo.local", password="Password123")
        UserRole.objects.create(user=self.seller_user, role=self.role_seller, is_primary=True)
        self.seller_profile = SellerProfile.objects.create(
            user=self.seller_user,
            store_name="Test Store Orders",
            status="APPROVED",
            pan_number="ABCDE1234B",
            gst_number="27ABCDE1234B1Z5"
        )

        resp = self.client.post("/api/v1/auth/login/", {"phone": "9000000201", "password": "Password123"})
        self.buyer_token = resp.data["access"]
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9000000202", "password": "Password123"})
        self.seller_token = resp.data["access"]

        self.category = Category.objects.create(name="Order Test Category", slug="order-test-cat")
        self.product = Product.objects.create(
            seller=self.seller_profile,
            category=self.category,
            name="Test Kurti",
            slug="test-kurti-orders",
            brand="BIBA",
            base_price=Decimal("599.00"),
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
            status="ACTIVE",
            approval_status="APPROVED"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product, sku="KURTI-ORDER-M", price=Decimal("599.00")
        )
        self.inventory = Inventory.objects.get(variant=self.variant)
        self.inventory.available_quantity = 10
        self.inventory.save()

    def _auth_buyer(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.buyer_token}")

    def _auth_seller(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.seller_token}")

    def _create_cart_with_item(self, qty=2):
        cart = Cart.objects.create(user=self.buyer)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=qty)
        return cart

    def test_checkout_success(self):
        self._auth_buyer()
        self._create_cart_with_item(qty=2)

        resp = self.client.post("/api/v1/orders/checkout/", CHECKOUT_PAYLOAD, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "PENDING")
        self.assertEqual(resp.data["payment_status"], "PAID")  # COD = PAID
        self.assertEqual(len(resp.data["items"]), 1)
        self.assertEqual(resp.data["items"][0]["quantity"], 2)

        # Inventory deducted
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.available_quantity, 8)
        self.assertEqual(self.inventory.reserved_quantity, 2)

        # Cart cleared
        self.assertEqual(Cart.objects.get(user=self.buyer).items.count(), 0)

    def test_checkout_empty_cart_fails(self):
        self._auth_buyer()
        Cart.objects.create(user=self.buyer)  # Empty cart

        resp = self.client.post("/api/v1/orders/checkout/", CHECKOUT_PAYLOAD, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("empty", resp.data.get("detail", "").lower())

    def test_checkout_insufficient_stock_fails(self):
        self._auth_buyer()
        self.inventory.available_quantity = 1
        self.inventory.save()
        self._create_cart_with_item(qty=5)  # More than available

        resp = self.client.post("/api/v1/orders/checkout/", CHECKOUT_PAYLOAD, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_buyer_can_list_own_orders(self):
        self._auth_buyer()
        self._create_cart_with_item()
        self.client.post("/api/v1/orders/checkout/", CHECKOUT_PAYLOAD, format="json")

        resp = self.client.get("/api/v1/orders/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_buyer_can_cancel_pending_order(self):
        self._auth_buyer()
        self._create_cart_with_item(qty=2)
        checkout_resp = self.client.post("/api/v1/orders/checkout/", CHECKOUT_PAYLOAD, format="json")
        order_id = checkout_resp.data["id"]

        resp = self.client.post(f"/api/v1/orders/{order_id}/cancel/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "CANCELLED")

        # Inventory released
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.available_quantity, 10)
        self.assertEqual(self.inventory.reserved_quantity, 0)

    def test_seller_can_view_order_items(self):
        self._auth_buyer()
        self._create_cart_with_item(qty=1)
        self.client.post("/api/v1/orders/checkout/", CHECKOUT_PAYLOAD, format="json")

        self._auth_seller()
        resp = self.client.get("/api/v1/seller/orders/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["sku"], "KURTI-ORDER-M")

    def test_seller_can_update_item_status(self):
        self._auth_buyer()
        self._create_cart_with_item(qty=1)
        self.client.post("/api/v1/orders/checkout/", CHECKOUT_PAYLOAD, format="json")

        self._auth_seller()
        items_resp = self.client.get("/api/v1/seller/orders/")
        item_id = items_resp.data[0]["id"]

        resp = self.client.patch(f"/api/v1/seller/orders/{item_id}/update-status/", {"item_status": "CONFIRMED"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["item_status"], "CONFIRMED")

    def test_seller_cannot_skip_status(self):
        self._auth_buyer()
        self._create_cart_with_item(qty=1)
        self.client.post("/api/v1/orders/checkout/", CHECKOUT_PAYLOAD, format="json")

        self._auth_seller()
        items_resp = self.client.get("/api/v1/seller/orders/")
        item_id = items_resp.data[0]["id"]

        # Cannot jump from PENDING directly to SHIPPED
        resp = self.client.patch(f"/api/v1/seller/orders/{item_id}/update-status/", {"item_status": "SHIPPED"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
