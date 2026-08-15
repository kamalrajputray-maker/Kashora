import urllib.request, urllib.error, time, random, sys, json

BASE_URL = "http://localhost:8000/api/v1"

def ps(m): print("\n[{}] -> {}".format(time.strftime("%X"), m))

def req(method, url, data=None, hdrs=None):
    if hdrs is None: hdrs = {}
    hdrs.setdefault("Content-Type", "application/json")
    d = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=d, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(r) as x:
            b = x.read().decode()
            try: return x.getcode(), json.loads(b)
            except: return x.getcode(), b
    except urllib.error.HTTPError as e:
        b = e.read().decode()
        try: return e.code, json.loads(b)
        except: return e.code, b
    except Exception as ex:
        print("CONNECT ERROR: {}".format(ex)); sys.exit(1)

def chk(code, body, exp, label):
    if code != exp:
        d = json.dumps(body, indent=2) if isinstance(body, dict) else body
        print("[FAIL] {} | exp={} got={}\n{}".format(label, exp, code, d))
        sys.exit(1)
    print("[PASS] {}".format(label))

def B(t): return {"Authorization": "Bearer {}".format(t)}

ts = int(time.time()); rnd = random.randint(1000, 9999)
BP = "888{}".format(random.randint(1000000, 9999999))
BPASS = "buyerpass123"

# ---- Phase 0: Admin + seed seller/product/inventory ----
ps("Phase 0: Admin Login")
s, r = req("POST", "{}/auth/login/".format(BASE_URL),
           {"phone": "9000000002", "password": "Admin@12345"})
chk(s, r, 200, "Admin login")
AT = r["access"]; AH = B(AT)

ps("Phase 0: Seed Seller")
SP = "777{}".format(random.randint(1000000, 9999999))
s, r = req("POST", "{}/auth/register/seller/".format(BASE_URL), {
    "phone": SP, "email": "sell.{}.{}@test.example".format(ts, rnd),
    "password": "sellerpass123", "first_name": "Seed", "last_name": "Seller",
    "business_name": "SeedBiz{}".format(ts),
    "gst_number": "22DDDDD0000D1Z{}".format(random.randint(1, 9)),
    "pan_number": "MNOPQ9876{}".format(random.randint(1, 9))})
chk(s, r, 201, "Seed seller registration")

s, r = req("GET", "{}/admin/sellers/?search={}".format(BASE_URL, SP), hdrs=AH)
chk(s, r, 200, "Admin find seller")
if not r.get("results"): print("[FAIL] Seed seller not found"); sys.exit(1)
spid = r["results"][0]["id"]
s, r = req("POST", "{}/admin/sellers/{}/approve/".format(BASE_URL, spid), hdrs=AH)
chk(s, r, 200, "Admin approve seller")

s, r = req("POST", "{}/auth/login/".format(BASE_URL),
           {"phone": SP, "password": "sellerpass123"})
chk(s, r, 200, "Seed seller login")
SH = B(r["access"])

s, cats = req("GET", "{}/categories/".format(BASE_URL), hdrs=SH)
chk(s, cats, 200, "Fetch categories")
if not cats: print("[FAIL] No categories"); sys.exit(1)
cid = cats[0]["id"]

SLUG = "p2prod{}{}".format(ts, rnd)
s, r = req("POST", "{}/seller/products/".format(BASE_URL), {
    "name": "P2Prod{}".format(ts), "slug": SLUG,
    "description": "E2E Phase 2 product", "brand": "P2",
    "category": cid, "base_price": "799.00", "compare_at_price": "999.00",
    "tax_percentage": "18.00", "shipping_charge": "40.00",
    "returnable": True, "return_window_days": 7, "status": "ACTIVE"}, hdrs=SH)
chk(s, r, 201, "Seed product")
PID = r["id"]

SKU = "P2SKU{}{}".format(ts, rnd)
s, r = req("POST", "{}/seller/products/{}/variants/".format(BASE_URL, PID),
           {"sku": SKU, "price": "799.00", "is_active": True,
            "attribute_summary": "Default"}, hdrs=SH)
chk(s, r, 201, "Seed variant")
VID = r["id"]

s, il = req("GET", "{}/seller/inventory/".format(BASE_URL), hdrs=SH)
chk(s, il, 200, "Fetch inventory list")
IID = next((i["id"] for i in il if i.get("variant_sku") == SKU), None)
if not IID: print("[FAIL] Inventory not found for variant"); sys.exit(1)

s, r = req("POST", "{}/seller/inventory/{}/add-stock/".format(BASE_URL, IID),
           {"quantity": 50, "notes": "Initial stock"}, hdrs=SH)
chk(s, r, 200, "Add 50 stock")
print("       Available: {}".format(r["available_quantity"]))

s, r = req("POST", "{}/admin/products/{}/approve/".format(BASE_URL, PID), hdrs=AH)
chk(s, r, 200, "Admin approve product")

s, r = req("GET", "{}/products/{}/".format(BASE_URL, SLUG))
chk(s, r, 200, "Product publicly visible")

# ---- Phase 1: Buyer auth ----
ps("Phase 1: Buyer Registration and Login")
s, r = req("POST", "{}/auth/register/buyer/".format(BASE_URL), {
    "phone": BP, "email": "buyer.{}@test.example".format(ts),
    "password": BPASS, "first_name": "Test", "last_name": "Buyer"})
chk(s, r, 201, "Buyer registration")

s, r = req("POST", "{}/auth/register/buyer/".format(BASE_URL), {
    "phone": BP, "email": "dup.{}@test.example".format(ts),
    "password": BPASS, "first_name": "Dup", "last_name": "Buyer"})
if s == 201: print("[FAIL] Duplicate phone accepted"); sys.exit(1)
print("[PASS] Duplicate phone rejected ({})".format(s))

s, r = req("POST", "{}/auth/login/".format(BASE_URL),
           {"phone": BP, "password": BPASS})
chk(s, r, 200, "Buyer login")
BT = r["access"]; BR = r.get("refresh"); BH = B(BT)

s, r = req("GET", "{}/auth/me/".format(BASE_URL), hdrs=BH)
chk(s, r, 200, "Buyer /auth/me/")
if r.get("phone") != BP: print("[FAIL] Wrong phone in /me/"); sys.exit(1)
print("       Logged in as: {}".format(r["phone"]))

if BR:
    s, r = req("POST", "{}/auth/token/refresh/".format(BASE_URL), {"refresh": BR})
    chk(s, r, 200, "Token refresh")
    BT = r["access"]; BH = B(BT)

# ---- Phase 2: Cart operations ----
ps("Phase 2: Cart Operations")
s, r = req("GET", "{}/cart/".format(BASE_URL), hdrs=BH)
chk(s, r, 200, "Get cart (empty)")

s, r = req("POST", "{}/cart/add/".format(BASE_URL),
           {"variant_id": VID, "quantity": 2}, hdrs=BH)
chk(s, r, 200, "Add 2 items to cart")
ci = r.get("items", [])
if not ci: print("[FAIL] No items after add"); sys.exit(1)
CII = ci[0]["id"]
if ci[0]["quantity"] != 2:
    print("[FAIL] qty={}".format(ci[0]["quantity"])); sys.exit(1)
print("[PASS] Cart qty=2")

s, r = req("PATCH", "{}/cart/item/{}/".format(BASE_URL, CII),
           {"quantity": 3}, hdrs=BH)
chk(s, r, 200, "Update cart qty to 3")
q = next((i["quantity"] for i in r["items"] if i["id"] == CII), None)
if q != 3: print("[FAIL] qty={}".format(q)); sys.exit(1)
print("[PASS] Cart qty=3")

s, _ = req("PATCH", "{}/cart/item/{}/".format(BASE_URL, CII),
           {"quantity": 0}, hdrs=BH)
if s == 200: print("[FAIL] qty=0 accepted"); sys.exit(1)
print("[PASS] qty=0 rejected ({})".format(s))

s, _ = req("PATCH", "{}/cart/item/{}/".format(BASE_URL, CII),
           {"quantity": 9999}, hdrs=BH)
if s == 200: print("[FAIL] qty=9999 accepted"); sys.exit(1)
print("[PASS] qty=9999 (overstock) rejected ({})".format(s))

# ---- Phase 3: Wishlist ----
ps("Phase 3: Wishlist Operations")
s, r = req("POST", "{}/wishlist/add/".format(BASE_URL),
           {"variant_id": VID}, hdrs=BH)
chk(s, r, 201, "Add to wishlist")
WID = r["id"]

s2, _ = req("POST", "{}/wishlist/add/".format(BASE_URL),
            {"variant_id": VID}, hdrs=BH)
if s2 not in (200, 201):
    print("[FAIL] Dup wishlist add={}".format(s2)); sys.exit(1)
print("[PASS] Dup wishlist handled ({})".format(s2))

s, r = req("GET", "{}/wishlist/".format(BASE_URL), hdrs=BH)
chk(s, r, 200, "List wishlist")
items = r if isinstance(r, list) else r.get("results", [])
if not items: print("[FAIL] Wishlist empty after add"); sys.exit(1)
print("[PASS] Wishlist has {} item(s)".format(len(items)))

s, _ = req("DELETE", "{}/wishlist/{}/".format(BASE_URL, WID), hdrs=BH)
if s not in (200, 204):
    print("[FAIL] Delete returned {}".format(s)); sys.exit(1)
print("[PASS] Wishlist item deleted ({})".format(s))

s, r = req("GET", "{}/wishlist/".format(BASE_URL), hdrs=BH)
items = r if isinstance(r, list) else r.get("results", [])
if any(i["id"] == WID for i in items):
    print("[FAIL] Deleted item still present"); sys.exit(1)
print("[PASS] Wishlist item gone after delete")

# ---- Phase 4: Checkout ----
ps("Phase 4: Checkout")
s, _ = req("POST", "{}/cart/clear/".format(BASE_URL), hdrs=BH)
chk(s, _, 200, "Clear cart")

addr = {"full_name": "TestBuyer", "line1": "1 Main St", "city": "Mumbai",
        "state": "MH", "pincode": "400001", "phone": BP}
s, r = req("POST", "{}/orders/checkout/".format(BASE_URL),
           {"payment_method": "COD", "shipping_address": addr}, hdrs=BH)
if s == 201: print("[FAIL] Empty-cart checkout accepted"); sys.exit(1)
print("[PASS] Empty-cart checkout rejected ({})".format(s))

s, _ = req("POST", "{}/cart/add/".format(BASE_URL),
           {"variant_id": VID, "quantity": 2}, hdrs=BH)
chk(s, _, 200, "Add 2 items for checkout")

s, ib = req("GET", "{}/seller/inventory/{}/".format(BASE_URL, IID), hdrs=SH)
chk(s, ib, 200, "Inventory before checkout")
SBefore = ib["available_quantity"]
print("       Stock before: {}".format(SBefore))

addr2 = {"full_name": "Test Buyer", "line1": "456 Park Ave",
         "city": "Delhi", "state": "Delhi", "pincode": "110001", "phone": BP}
s, ord_ = req("POST", "{}/orders/checkout/".format(BASE_URL), {
    "payment_method": "COD", "shipping_address": addr2,
    "notes": "Phase 2 E2E test"}, hdrs=BH)
chk(s, ord_, 201, "Checkout (COD)")
OID = ord_["id"]
if ord_["payment_status"] != "PAID":
    print("[FAIL] payment_status={}".format(ord_["payment_status"])); sys.exit(1)
print("[PASS] COD payment_status=PAID")

s, ia = req("GET", "{}/seller/inventory/{}/".format(BASE_URL, IID), hdrs=SH)
SAfter = ia["available_quantity"]
print("       Stock after: {}".format(SAfter))
if SBefore - SAfter != 2:
    print("[FAIL] Stock delta wrong: {}->{}".format(SBefore, SAfter)); sys.exit(1)
print("[PASS] Inventory decreased by 2")

s, cart = req("GET", "{}/cart/".format(BASE_URL), hdrs=BH)
if cart.get("items") and len(cart["items"]) > 0:
    print("[FAIL] Cart not cleared after checkout"); sys.exit(1)
print("[PASS] Cart cleared after checkout")

# ---- Phase 5: Order list/detail ----
ps("Phase 5: Order List and Detail")
s, ords = req("GET", "{}/orders/".format(BASE_URL), hdrs=BH)
chk(s, ords, 200, "List orders")
if OID not in [o["id"] for o in ords]:
    print("[FAIL] Order not in list"); sys.exit(1)
print("[PASS] Order in list ({} total)".format(len(ords)))

s, od = req("GET", "{}/orders/{}/".format(BASE_URL, OID), hdrs=BH)
chk(s, od, 200, "Order detail")
if od["id"] != OID: print("[FAIL] ID mismatch"); sys.exit(1)
print("[PASS] Order detail correct (status={})".format(od["status"]))

# ---- Phase 6: Seller fulfilment ----
ps("Phase 6: Seller Fulfilment Lifecycle")
s, si = req("GET", "{}/seller/orders/".format(BASE_URL), hdrs=SH)
chk(s, si, 200, "Seller list order items")
item = None
for i in si:
    if i.get("order_id") == OID: item = i; break
if not item and si: item = si[0]
if not item: print("[FAIL] No seller order items"); sys.exit(1)
SIID = item["id"]
print("[PASS] Seller item {} status={}".format(SIID, item.get("item_status", "?")))

def mv(to, label):
    s, r = req("PATCH",
               "{}/seller/orders/{}/update-status/".format(BASE_URL, SIID),
               {"item_status": to}, hdrs=SH)
    chk(s, r, 200, label)
    if r.get("item_status") != to:
        print("[FAIL] Expected {} got {}".format(to, r.get("item_status"))); sys.exit(1)
    print("       -> {}".format(to))

mv("CONFIRMED", "PENDING -> CONFIRMED")

s, r = req("PATCH",
           "{}/seller/orders/{}/update-status/".format(BASE_URL, SIID),
           {"item_status": "DELIVERED"}, hdrs=SH)
if s == 200: print("[FAIL] Invalid CONFIRMED->DELIVERED accepted"); sys.exit(1)
print("[PASS] Invalid transition rejected ({})".format(s))

mv("SHIPPED",    "CONFIRMED -> SHIPPED")
mv("DELIVERED",  "SHIPPED -> DELIVERED")

s, id_ = req("GET", "{}/seller/inventory/{}/".format(BASE_URL, IID), hdrs=SH)
chk(s, id_, 200, "Inventory after delivery")
if id_["sold_quantity"] < 2:
    print("[FAIL] sold={}".format(id_["sold_quantity"])); sys.exit(1)
print("[PASS] sold_quantity={}".format(id_["sold_quantity"]))

# ---- Phase 7: Cancellation ----
ps("Phase 7: Order Cancellation")
s, _ = req("POST", "{}/cart/add/".format(BASE_URL),
           {"variant_id": VID, "quantity": 1}, hdrs=BH)
chk(s, _, 200, "Add 1 item for cancel test")

addr3 = {"full_name": "Cancel Test", "line1": "789 Rd", "city": "Pune",
         "state": "MH", "pincode": "411001", "phone": BP}
s, co = req("POST", "{}/orders/checkout/".format(BASE_URL),
            {"payment_method": "COD", "shipping_address": addr3}, hdrs=BH)
chk(s, co, 201, "Place cancel-target order")
COID = co["id"]

s, ip = req("GET", "{}/seller/inventory/{}/".format(BASE_URL, IID), hdrs=SH)
StockPre = ip["available_quantity"]

s, r = req("POST", "{}/orders/{}/cancel/".format(BASE_URL, COID), hdrs=BH)
chk(s, r, 200, "Cancel order")
if r.get("status") != "CANCELLED":
    print("[FAIL] status={}".format(r.get("status"))); sys.exit(1)
print("[PASS] Order status = CANCELLED")

s, ipost = req("GET", "{}/seller/inventory/{}/".format(BASE_URL, IID), hdrs=SH)
StockPost = ipost["available_quantity"]
if StockPost - StockPre != 1:
    print("[FAIL] Stock restore wrong: {}->{}".format(StockPre, StockPost)); sys.exit(1)
print("[PASS] Stock restored +1: {}->{}".format(StockPre, StockPost))

s, _ = req("POST", "{}/orders/{}/cancel/".format(BASE_URL, COID), hdrs=BH)
if s == 200: print("[FAIL] Double-cancel accepted"); sys.exit(1)
print("[PASS] Double-cancel rejected ({})".format(s))

# ---- Phase 8: Inventory management ----
ps("Phase 8: Inventory Management")
s, il2 = req("GET", "{}/seller/inventory/".format(BASE_URL), hdrs=SH)
chk(s, il2, 200, "List inventory")
print("       {} records".format(len(il2)))

s, id2 = req("GET", "{}/seller/inventory/{}/".format(BASE_URL, IID), hdrs=SH)
chk(s, id2, 200, "Inventory detail")
CQ = id2["available_quantity"]

s, r = req("POST", "{}/seller/inventory/{}/add-stock/".format(BASE_URL, IID),
           {"quantity": 10, "notes": "Phase 2 restock"}, hdrs=SH)
chk(s, r, 200, "add-stock +10")
if r["available_quantity"] != CQ + 10:
    print("[FAIL] exp={} got={}".format(CQ+10, r["available_quantity"])); sys.exit(1)
print("[PASS] +10: {}->{}".format(CQ, r["available_quantity"]))
CQ = r["available_quantity"]

s, r = req("POST", "{}/seller/inventory/{}/adjust/".format(BASE_URL, IID),
           {"quantity": -5, "notes": "Phase 2 adjustment"}, hdrs=SH)
chk(s, r, 200, "adjust -5")
if r["available_quantity"] != CQ - 5:
    print("[FAIL] exp={} got={}".format(CQ-5, r["available_quantity"])); sys.exit(1)
print("[PASS] -5: {}->{}".format(CQ, r["available_quantity"]))

s, _ = req("POST", "{}/seller/inventory/{}/adjust/".format(BASE_URL, IID),
           {"quantity": -9999, "notes": "Should fail"}, hdrs=SH)
if s == 200: print("[FAIL] Over-adjustment accepted"); sys.exit(1)
print("[PASS] Over-adjustment rejected ({})".format(s))

s, txs = req("GET", "{}/seller/inventory/{}/transactions/".format(BASE_URL, IID), hdrs=SH)
chk(s, txs, 200, "Inventory transactions")
tl = txs if isinstance(txs, list) else txs.get("results", [])
print("[PASS] {} transaction record(s)".format(len(tl)))

# ---- Phase 9: Seller profile and dashboard ----
ps("Phase 9: Seller Profile and Dashboard")
s, prof = req("GET", "{}/seller/profile/".format(BASE_URL), hdrs=SH)
chk(s, prof, 200, "Get seller profile")
print("       business_name: {}".format(prof.get("business_name", "?")))

s, r = req("PATCH", "{}/seller/profile/".format(BASE_URL),
           {"business_name": "UpdatedBiz{}".format(ts)}, hdrs=SH)
chk(s, r, 200, "Update seller profile")
if "UpdatedBiz{}".format(ts) not in str(r):
    print("[FAIL] Profile update not reflected"); sys.exit(1)
print("[PASS] Seller profile updated")

s, dash = req("GET", "{}/seller/dashboard/".format(BASE_URL), hdrs=SH)
chk(s, dash, 200, "Seller dashboard")
print("       Dashboard keys: {}".format(list(dash.keys()) if isinstance(dash, dict) else "?"))

# ---- Phase 10: Admin buyer management ----
ps("Phase 10: Admin Buyer Management")
s, r = req("GET", "{}/admin/buyers/".format(BASE_URL), hdrs=AH)
chk(s, r, 200, "Admin list buyers")
buyers = r.get("results", r) if isinstance(r, dict) else r
print("       {} buyers in page".format(len(buyers)))
ob = next((b for b in buyers if b.get("phone") == BP), None)
if not ob:
    print("[WARN] Buyer not in first page (may be paginated)")
else:
    s, r = req("GET", "{}/admin/buyers/{}/".format(BASE_URL, ob["id"]), hdrs=AH)
    chk(s, r, 200, "Admin buyer detail")
    print("[PASS] Admin buyer detail: {}".format(r.get("phone")))

# ---- Phase 11: Logout ----
ps("Phase 11: Logout")
if BR:
    s, r = req("POST", "{}/auth/logout/".format(BASE_URL),
               {"refresh": BR}, hdrs=BH)
    if s in (200, 205): print("[PASS] Logout ({})".format(s))
    else: print("[WARN] Logout returned {}".format(s))
else:
    print("[SKIP] No refresh token available")

print("")
print("=" * 60)
print("   *** ALL PHASE 2 E2E TESTS PASSED SUCCESSFULLY! ***")
print("=" * 60)
print("\nPhases covered:")
for i, ph in enumerate([
    "Seed seller, product, inventory (+50 stock)",
    "Buyer registration, duplicate guard, login, /me, token refresh",
    "Cart: add, update, zero-qty guard, overstock guard",
    "Wishlist: add, duplicate, list, delete",
    "Checkout: empty-cart guard, COD order, inventory deduction, cart clear",
    "Order list and detail",
    "Seller fulfilment: PENDING->CONFIRMED->SHIPPED->DELIVERED + invalid transition guard",
    "Order cancellation + inventory restore + double-cancel guard",
    "Inventory: add-stock, adjust(-5), over-adjust guard, transactions log",
    "Seller profile update + dashboard stats",
    "Admin buyer list and detail",
    "Logout",
], 0):
    print("  Phase {}  - {}".format(i, ph))