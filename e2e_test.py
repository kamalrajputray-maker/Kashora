import urllib.request
import urllib.error
import time
import random
import sys
import json

BASE_URL = "http://localhost:8000/api/v1"

def print_step(msg):
    print(f"\n[{time.strftime('%X')}] -> {msg}")

def request(method, url, data=None, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = response.read().decode("utf-8")
            try:
                body_json = json.loads(body)
                return status, body_json
            except json.JSONDecodeError:
                return status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            body_json = json.loads(body)
            return e.code, body_json
        except json.JSONDecodeError:
            return e.code, body
    except Exception as e:
        print(f"Failed to connect to {url}: {e}")
        sys.exit(1)

def assert_status(status_code, response_body, expected, msg):
    if status_code != expected:
        print(f"[FAIL]: {msg} - Expected {expected}, got {status_code}")
        print(json.dumps(response_body, indent=2) if isinstance(response_body, dict) else response_body)
        sys.exit(1)
    else:
        print(f"[PASS]: {msg}")

def get_auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

# Generate unique strings
timestamp = int(time.time())
SELLER_PHONE = f"999{random.randint(1000000, 9999999)}"
SELLER_EMAIL = f"seller_{timestamp}@test.com"
SELLER_PASS = "testpass123"
PRODUCT_SLUG = f"test-product-{timestamp}"

# ---------------------------------------------------------
# Phase 1: Seller Onboarding & Approval
# ---------------------------------------------------------
print_step("Phase 1: Seller Registration")
register_data = {
    "phone": SELLER_PHONE,
    "email": SELLER_EMAIL,
    "password": SELLER_PASS,
    "first_name": "Test",
    "last_name": "Seller",
    "business_name": f"Test Business {timestamp}",
    "gst_number": f"22AAAAA0000A1Z{random.randint(1,9)}",
    "pan_number": f"ABCDE1234{random.randint(1,9)}"
}
status, resp = request("POST", f"{BASE_URL}/auth/register/seller/", data=register_data)
assert_status(status, resp, 201, "Seller registration")
seller_id = resp.get("user", {}).get("id")

print_step("Phase 1: Admin Login & Seller Approval")
status, resp = request("POST", f"{BASE_URL}/auth/login/", data={
    "phone": "9000000002",
    "password": "Admin@12345"
})
assert_status(status, resp, 200, "Admin login")
admin_token = resp.get("access")
admin_headers = get_auth_headers(admin_token)

status, resp = request("GET", f"{BASE_URL}/admin/sellers/?search={SELLER_PHONE}", headers=admin_headers)
assert_status(status, resp, 200, "Admin search for seller profile")

seller_profile_id = None
if resp.get("results"):
    seller_profile_id = resp.get("results")[0]["id"]
else:
    print("[FAIL]: Could not find seller profile via admin API")
    sys.exit(1)

status, resp = request("POST", f"{BASE_URL}/admin/sellers/{seller_profile_id}/approve/", headers=admin_headers)
assert_status(status, resp, 200, "Admin approve seller")

# ---------------------------------------------------------
# Phase 2: Store & Product Setup
# ---------------------------------------------------------
print_step("Phase 2: Seller Login")
status, resp = request("POST", f"{BASE_URL}/auth/login/", data={
    "phone": SELLER_PHONE,
    "password": SELLER_PASS
})
assert_status(status, resp, 200, "Seller login")
seller_token = resp.get("access")
seller_headers = get_auth_headers(seller_token)

status, categories = request("GET", f"{BASE_URL}/categories/", headers=seller_headers)
assert_status(status, categories, 200, "Fetch categories")

if not categories:
    print("[FAIL]: No categories available in database. Create one manually or script it.")
    sys.exit(1)
category_id = categories[0]["id"]
print(f"Using category: {categories[0]['name']}")

print_step("Phase 2: Product Creation")
product_data = {
    "name": f"Test E2E Product {timestamp}",
    "slug": PRODUCT_SLUG,
    "description": "This is a product created via E2E testing.",
    "brand": "E2E Brand",
    "category": category_id,
    "base_price": "999.00",
    "compare_at_price": "1299.00",
    "tax_percentage": "18.00",
    "shipping_charge": "50.00",
    "returnable": True,
    "return_window_days": 7,
    "status": "ACTIVE"
}
status, resp = request("POST", f"{BASE_URL}/seller/products/", data=product_data, headers=seller_headers)
assert_status(status, resp, 201, "Product creation")
product_id = resp.get("id")
product_approval = resp.get("approval_status")

if product_approval != "PENDING":
    print(f"[FAIL]: Expected Product approval_status to be 'PENDING', got '{product_approval}'")
    sys.exit(1)
print("[PASS]: Product defaults to PENDING status")

print_step("Phase 2: Product Variant & Inventory Setup")
variant_data = {
    "sku": f"SKU-{timestamp}",
    "price": "999.00",
    "is_active": True,
    "attribute_summary": "Default"
}
status, resp = request("POST", f"{BASE_URL}/seller/products/{product_id}/variants/", data=variant_data, headers=seller_headers)
assert_status(status, resp, 201, "Variant creation")

# ---------------------------------------------------------
# Phase 3: Buyer Search & Admin Approval
# ---------------------------------------------------------
print_step("Phase 3: Verify Buyer Cannot See Pending Product")
status, resp = request("GET", f"{BASE_URL}/products/{PRODUCT_SLUG}/")
if status == 200:
    print("[FAIL]: Buyer can see the pending product!")
    sys.exit(1)
else:
    print(f"[PASS]: Buyer correctly receives 404 (or similar error) for pending product (Got {status})")

print_step("Phase 3: Admin Approves Product")
status, resp = request("POST", f"{BASE_URL}/admin/products/{product_id}/approve/", headers=admin_headers)
assert_status(status, resp, 200, "Admin product approval")

print_step("Phase 3: Verify Buyer Can See Approved Product")
status, resp = request("GET", f"{BASE_URL}/products/{PRODUCT_SLUG}/")
assert_status(status, resp, 200, "Buyer fetch approved product details")

if resp.get("name") != product_data["name"]:
    print("[FAIL]: Product name mismatch")
    sys.exit(1)
if str(resp.get("base_price")) != str(product_data["base_price"]):
    print("[FAIL]: Product base_price mismatch")
    sys.exit(1)

print("\n*** ALL E2E TESTS PASSED SUCCESSFULLY! ***")
