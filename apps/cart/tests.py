from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from decimal import Decimal

from apps.accounts.models import Role, UserRole, SellerProfile, BuyerProfile
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import Inventory
from apps.cart.models import Cart, CartItem, WishlistItem

User = get_user_model()


class CartAndWishlistTests(APITestCase):

    def setUp(self):
        # Users & Roles
        self.role_buyer, _ = Role.objects.get_or_create(name="BUYER")
        self.role_seller, _ = Role.objects.get_or_create(name="SELLER")

        self.buyer_user = User.objects.create_user(phone="9000000101", email="buyer@demo.local", password="Password123")
        UserRole.objects.create(user=self.buyer_user, role=self.role_buyer, is_primary=True)
        BuyerProfile.objects.create(user=self.buyer_user)

        self.seller_user = User.objects.create_user(phone="9000000102", email="seller@demo.local", password="Password123")
        UserRole.objects.create(user=self.seller_user, role=self.role_seller, is_primary=True)
        self.seller_profile = SellerProfile.objects.create(
            user=self.seller_user,
            store_name="Test Store",
            status="APPROVED",
            pan_number="ABCDE1234A",
            gst_number="27ABCDE1234A1Z5"
        )

        # Login and obtain tokens
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9000000101", "password": "Password123"})
        self.buyer_token = resp.data["access"]

        resp = self.client.post("/api/v1/auth/login/", {"phone": "9000000102", "password": "Password123"})
        self.seller_token = resp.data["access"]

        # Category and Product setup
        self.category = Category.objects.create(name="Test Category", slug="test-cat")
        self.product = Product.objects.create(
            seller=self.seller_profile,
            category=self.category,
            name="Kurti Premium",
            slug="kurti-premium",
            brand="BIBA",
            base_price=Decimal("499.00"),
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
            status="ACTIVE",
            approval_status="APPROVED"
        )
        self.variant = ProductVariant.objects.create(product=self.product, sku="KURTI-PREM-M", price=Decimal("499.00"))
        
        # Initial Stock is set to 5
        self.inventory = Inventory.objects.get(variant=self.variant)
        self.inventory.available_quantity = 5
        self.inventory.save()

    def _auth_buyer(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.buyer_token}")

    def _auth_seller(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.seller_token}")

    def test_get_empty_cart_creates_cart(self):
        self._auth_buyer()
        response = self.client.get("/api/v1/cart/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 0)
        self.assertEqual(Cart.objects.filter(user=self.buyer_user).count(), 1)

    def test_add_item_to_cart_success(self):
        self._auth_buyer()
        data = {"variant_id": str(self.variant.id), "quantity": 2}
        response = self.client.post("/api/v1/cart/add/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["quantity"], 2)
        self.assertEqual(response.data["total_price"], Decimal("998.00"))

    def test_add_item_insufficient_inventory_fails(self):
        self._auth_buyer()
        data = {"variant_id": str(self.variant.id), "quantity": 10} # available stock is 5
        response = self.client.post("/api/v1/cart/add/", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data)

    def test_update_item_quantity_success(self):
        self._auth_buyer()
        cart = Cart.objects.create(user=self.buyer_user)
        item = CartItem.objects.create(cart=cart, variant=self.variant, quantity=1)

        response = self.client.patch(f"/api/v1/cart/item/{item.id}/", {"quantity": 3})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"][0]["quantity"], 3)

        # Exceeding stock fails
        response = self.client.patch(f"/api/v1/cart/item/{item.id}/", {"quantity": 8})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_item_from_cart(self):
        self._auth_buyer()
        cart = Cart.objects.create(user=self.buyer_user)
        item = CartItem.objects.create(cart=cart, variant=self.variant, quantity=1)

        response = self.client.delete(f"/api/v1/cart/item/{item.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 0)

    def test_wishlist_add_list_and_remove(self):
        self._auth_buyer()
        
        # Add to wishlist
        response = self.client.post("/api/v1/wishlist/add/", {"variant_id": str(self.variant.id)})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WishlistItem.objects.count(), 1)

        # List wishlist
        response = self.client.get("/api/v1/wishlist/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["sku"], "KURTI-PREM-M")

        # Delete wishlist item
        item_id = response.data[0]["id"]
        response = self.client.delete(f"/api/v1/wishlist/{item_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(WishlistItem.objects.count(), 0)
