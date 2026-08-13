from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User, Role, UserRole, SellerProfile
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import Inventory, InventoryTransaction

class InventoryTests(APITestCase):
    def setUp(self):
        # Create roles
        role_seller, _ = Role.objects.get_or_create(name="SELLER")

        # Seller A
        self.sellerA_user, _ = User.objects.get_or_create(phone="9200000001", defaults={"email": "sellerA@demo.local"})
        self.sellerA_user.set_password("Demo@1234")
        self.sellerA_user.save()
        UserRole.objects.get_or_create(user=self.sellerA_user, role=role_seller, is_primary=True)
        self.sellerA_profile, _ = SellerProfile.objects.get_or_create(
            user=self.sellerA_user,
            defaults={"store_name": "Seller A Store", "pan_number": "ABCDE1234A", "gst_number": "27ABCDE1234A1Z5"}
        )

        # Seller B
        self.sellerB_user, _ = User.objects.get_or_create(phone="9200000002", defaults={"email": "sellerB@demo.local"})
        self.sellerB_user.set_password("Demo@1234")
        self.sellerB_user.save()
        UserRole.objects.get_or_create(user=self.sellerB_user, role=role_seller, is_primary=True)
        self.sellerB_profile, _ = SellerProfile.objects.get_or_create(
            user=self.sellerB_user,
            defaults={"store_name": "Seller B Store", "pan_number": "FGHIJ5678B", "gst_number": "27FGHIJ5678B1Z5"}
        )

        self.category = Category.objects.create(name="Inventory Test Category", slug="inv-test-cat")
        self.product = Product.objects.create(
            seller=self.sellerA_profile,
            category=self.category,
            name="Kurti A",
            slug="kurti-a",
            description="kurti",
            brand="BIBA",
            base_price="499.00",
            tax_percentage=Decimal("12.00"),
            shipping_charge=Decimal("40.00"),
        )
        self.variant = ProductVariant.objects.create(product=self.product, sku="KURTI-A-S", price="499.00")
        
        # Logins
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9200000001", "password": "Demo@1234"})
        self.tokenA = resp.data["access"]
        resp = self.client.post("/api/v1/auth/login/", {"phone": "9200000002", "password": "Demo@1234"})
        self.tokenB = resp.data["access"]

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_inventory_signal_auto_created(self):
        # Inventory should automatically exist because variant was created
        inv = Inventory.objects.filter(variant=self.variant).first()
        self.assertIsNotNone(inv)
        self.assertEqual(inv.available_quantity, 0)
        self.assertEqual(inv.status, "OUT_OF_STOCK")

    def test_seller_can_add_stock(self):
        self._auth(self.tokenA)
        inv = Inventory.objects.get(variant=self.variant)
        res = self.client.post(f"/api/v1/seller/inventory/{inv.id}/add-stock/", {"quantity": 10, "notes": "Initial stock"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        inv.refresh_from_db()
        self.assertEqual(inv.available_quantity, 10)
        self.assertEqual(inv.status, "IN_STOCK")
        
        # Transaction log should exist
        tx = InventoryTransaction.objects.filter(inventory=inv).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.transaction_type, "STOCK_IN")
        self.assertEqual(tx.quantity, 10)

    def test_seller_can_adjust_stock_and_threshold(self):
        self._auth(self.tokenA)
        inv = Inventory.objects.get(variant=self.variant)
        res = self.client.post(
            f"/api/v1/seller/inventory/{inv.id}/adjust/",
            {"quantity": 12, "low_stock_threshold": 15, "notes": "Adjusting threshold"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        inv.refresh_from_db()
        self.assertEqual(inv.available_quantity, 12)
        self.assertEqual(inv.low_stock_threshold, 15)
        self.assertEqual(inv.status, "LOW_STOCK")

    def test_negative_stock_prevention(self):
        self._auth(self.tokenA)
        inv = Inventory.objects.get(variant=self.variant)
        res = self.client.post(
            f"/api/v1/seller/inventory/{inv.id}/adjust/",
            {"quantity": -5, "notes": "Subtracting"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
        inv.refresh_from_db()
        self.assertEqual(inv.available_quantity, 0)

    def test_seller_isolation(self):
        self._auth(self.tokenB)
        inv = Inventory.objects.get(variant=self.variant)
        res = self.client.post(f"/api/v1/seller/inventory/{inv.id}/add-stock/", {"quantity": 10})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_transaction_history_listing(self):
        self._auth(self.tokenA)
        inv = Inventory.objects.get(variant=self.variant)
        self.client.post(f"/api/v1/seller/inventory/{inv.id}/add-stock/", {"quantity": 10})
        self.client.post(f"/api/v1/seller/inventory/{inv.id}/adjust/", {"quantity": -3})
        
        res = self.client.get(f"/api/v1/seller/inventory/{inv.id}/transactions/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Using pagination or list response depending on implementation; viewset uses standard DRF format.
        # If paginated, count is in results.
        if "results" in res.data:
            self.assertEqual(res.data["count"], 2)
        else:
            self.assertEqual(len(res.data), 2)
