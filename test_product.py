import urllib.request, json
# Login
url_login = "http://localhost:8000/api/v1/auth/login/"
payload = {"phone": "9991234567", "password": "Seller@12345"}
req = urllib.request.Request(url_login, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
        token = data.get('access')
except urllib.error.HTTPError as e:
    print("Login failed", e.read())
    exit(1)

# List categories
url_cat = "http://localhost:8000/api/v1/categories/"
req_cat = urllib.request.Request(url_cat, headers={'Authorization': 'Bearer ' + token})
try:
    with urllib.request.urlopen(req_cat) as res:
        cats = json.loads(res.read())
        print("Categories:", cats)
except urllib.error.HTTPError as e:
    print("Categories failed", e.read())
    exit(1)

cat_id = cats[0]['id'] if cats else ""

# Create Product
url_prod = "http://localhost:8000/api/v1/seller/products/"
prod_payload = {
    "name": "E2E Test Product",
    "slug": "e2e-test-product",
    "description": "test",
    "brand": "Test Brand",
    "category": cat_id,
    "base_price": "599",
    "compare_at_price": None,
    "tax_percentage": "18",
    "shipping_charge": "50",
    "returnable": True,
    "return_window_days": 7,
    "status": "DRAFT"
}
req_prod = urllib.request.Request(url_prod, data=json.dumps(prod_payload).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
try:
    with urllib.request.urlopen(req_prod) as res:
        print("Product created!", res.read())
except urllib.error.HTTPError as e:
    print("Product failed", e.code, e.read().decode())
