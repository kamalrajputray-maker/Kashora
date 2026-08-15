import time, random, sys, io

# Force UTF-8 output so Windows cp1252 terminal never causes UnicodeEncodeError
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright, expect

# ------------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------------
FRONTEND  = "http://localhost:3000"
API_BASE  = "http://localhost:8000/api/v1"
SLOW_MO   = 600          # ms between actions  (set to 0 for fast run)
HEADLESS  = False        # False = visible browser window

ts           = int(time.time())
SELLER_PHONE = f"999{random.randint(1000000, 9999999)}"
SELLER_EMAIL = f"seller_{ts}@test.com"
SELLER_PASS  = "Seller@12345"
PRODUCT_NAME = f"E2E Product {ts}"
PRODUCT_SKU  = f"SKU-{ts}"

ADMIN_PHONE  = "9000000002"
ADMIN_PASS   = "Admin@12345"

# ------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------
def step(msg):
    line = f"\n{'='*60}\n  {msg}\n{'='*60}"
    print(line)

def ok(msg):   print(f"  [PASS] {msg}")
def fail(msg): print(f"  [FAIL] {msg}"); sys.exit(1)

def fill(page, selector, value, timeout=10000):
    page.wait_for_selector(selector, timeout=timeout)
    page.fill(selector, value)

def click(page, selector, timeout=10000):
    page.wait_for_selector(selector, timeout=timeout)
    page.click(selector)

def navigate(page, path, label=""):
    page.goto(f"{FRONTEND}{path}")
    print(f"  >> Navigated to {path}" + (f" ({label})" if label else ""))
    time.sleep(0.4)

def wait_url(page, fragment, timeout=15000):
    page.wait_for_url(f"**{fragment}**", timeout=timeout)

# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------
def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS, slow_mo=SLOW_MO)
        ctx     = browser.new_context(viewport={"width": 1400, "height": 860})
        page    = ctx.new_page()

        # -- make console errors visible --------------------------
        page.on("console", lambda m: print(f"  [browser] {m.type}: {m.text}") if m.type == "error" else None)

        try:
            run_tests(page)
        finally:
            time.sleep(2)
            browser.close()


def run_tests(page):

    # ------------------------------------------------------------
    # PHASE 1 – SELLER REGISTRATION
    # ------------------------------------------------------------
    step("PHASE 1a -- Seller Registration")
    navigate(page, "/seller/register", "Seller Register Page")

    fill(page, 'input[name="first_name"]',   "Test")
    fill(page, 'input[name="last_name"]',    "Seller")
    fill(page, 'input[name="phone"]',        SELLER_PHONE)
    fill(page, 'input[name="email"]',        SELLER_EMAIL)
    fill(page, 'input[name="business_name"]',f"Test Business {int(time.time())}")
    fill(page, 'input[name="gst_number"]',   "22AAAAA0000A1Z5")
    fill(page, 'input[name="pan_number"]',   "ABCDE1234F")
    fill(page, 'input[name="password"]',     SELLER_PASS)
    fill(page, 'input[name="confirmPassword"]', SELLER_PASS)

    click(page, 'button[type="submit"]')
    wait_url(page, "/seller/login")
    ok(f"Seller registered → phone={SELLER_PHONE}")

    # ------------------------------------------------------------
    # PHASE 1b – ADMIN LOGIN & APPROVE SELLER
    # ------------------------------------------------------------
    step("PHASE 1b -- Admin: Login & Approve Seller")
    navigate(page, "/admin/login", "Admin Login")

    fill(page, 'input[placeholder="Enter admin phone number"]', ADMIN_PHONE)
    fill(page, 'input[type="password"]',                       ADMIN_PASS)
    click(page, 'button[type="submit"]')
    wait_url(page, "/admin")
    ok("Admin logged in")

    # navigate to Sellers list
    page.get_by_role("link", name="Sellers").click()
    wait_url(page, "/admin/sellers")

    # search for our seller
    page.get_by_placeholder("Search phone, email...").fill(SELLER_PHONE)
    time.sleep(1.5)

    # click View on matching row
    row = page.locator("tr", has_text=SELLER_PHONE)
    row.get_by_role("link", name="View").click()
    ok("Opened seller profile page")

    # click Approve → Confirm
    page.get_by_role("button", name="Approve").click()
    page.get_by_role("button", name="Confirm").click()

    # verify approved
    page.wait_for_selector("text=Approved", timeout=10000)
    ok("Seller APPROVED by admin ✔")

    # ------------------------------------------------------------
    # PHASE 2 – SELLER: LOGIN → CREATE PRODUCT
    # ------------------------------------------------------------
    step("PHASE 2a -- Seller Login")
    navigate(page, "/seller/login", "Seller Login")

    fill(page, 'input[placeholder="Enter your phone number"]', SELLER_PHONE)
    fill(page, 'input[type="password"]',                       SELLER_PASS)
    click(page, 'button[type="submit"]')
    wait_url(page, "/seller/dashboard")
    ok("Seller on dashboard")

    # -- navigate to New Product --
    step("PHASE 2b -- Seller: Create Product")
    page.get_by_role("link", name="Products").click()
    page.get_by_role("link", name="New Product").click()

    fill(page, 'input[name="name"]',          PRODUCT_NAME)
    fill(page, 'input[name="brand"]',         "E2E Brand")
    page.locator('select[name="category"]').select_option(index=1)
    page.locator('input[name="base_price"]').clear()
    fill(page, 'input[name="base_price"]',    "999")
    page.locator('input[name="tax_percentage"]').clear()
    fill(page, 'input[name="tax_percentage"]',"18")
    page.locator('input[name="shipping_charge"]').clear()
    fill(page, 'input[name="shipping_charge"]',"50")
    page.locator('textarea[name="description"]').clear()
    fill(page, 'textarea[name="description"]',"E2E browser test product via Playwright.")

    page.get_by_role("button", name="Create Product").click()
    ok("Product form submitted")

    # -- add variants --
    page.get_by_placeholder("Attribute name (e.g. Size, Color)").fill("Size")
    page.keyboard.press("Enter")
    page.get_by_placeholder("Add Size value...").fill("L")
    page.keyboard.press("Enter")
    page.get_by_placeholder("Add Size value...").fill("XL")
    page.keyboard.press("Enter")

    page.get_by_placeholder("Attribute name (e.g. Size, Color)").fill("Color")
    page.keyboard.press("Enter")
    page.get_by_placeholder("Add Color value...").fill("Red")
    page.keyboard.press("Enter")
    page.get_by_placeholder("Add Color value...").fill("Blue")
    page.keyboard.press("Enter")

    # set price and generate  (exact=True avoids collision with base_price input)
    variant_price = page.get_by_placeholder("499", exact=True)
    variant_price.clear()
    variant_price.fill("999")
    page.get_by_role("button", name="Generate Variants").click()

    page.wait_for_selector("text=Generated", timeout=12000)
    ok("Variants generated")

    # verify PENDING in product list
    navigate(page, "/seller/products", "Product List")
    page.wait_for_selector(f"text={PRODUCT_NAME}", timeout=10000)
    row2 = page.locator("tr", has_text=PRODUCT_NAME)
    expect(row2.locator("text=PENDING")).to_be_visible()
    ok("Product shows PENDING status in list ✔")

    # ------------------------------------------------------------
    # PHASE 3a – ADMIN APPROVES PRODUCT
    # ------------------------------------------------------------
    step("PHASE 3a -- Admin: Approve Product")
    navigate(page, "/admin/login", "Admin Login")
    fill(page, 'input[placeholder="Enter admin phone number"]', ADMIN_PHONE)
    fill(page, 'input[type="password"]',                       ADMIN_PASS)
    click(page, 'button[type="submit"]')
    wait_url(page, "/admin")

    page.get_by_role("link", name="Products").click()
    wait_url(page, "/admin/products")

    page.wait_for_selector(f"text={PRODUCT_NAME}", timeout=10000)
    prod_row = page.locator("tr", has_text=PRODUCT_NAME)
    prod_row.get_by_role("button", name="Approve").click()

    expect(prod_row.locator("text=APPROVED")).to_be_visible(timeout=10000)
    ok("Product APPROVED by admin ✔")

    # ------------------------------------------------------------
    # PHASE 3b – BUYER SEES APPROVED PRODUCT
    # ------------------------------------------------------------
    step("PHASE 3b -- Buyer: View Approved Product")
    navigate(page, "/products", "Product Listing")

    search = page.get_by_placeholder("Search for products, brands and more...")
    search.fill(PRODUCT_NAME)
    search.press("Enter")

    page.wait_for_selector(f"text={PRODUCT_NAME}", timeout=15000)
    page.locator(f"text={PRODUCT_NAME}").first.click()

    page.wait_for_selector(f"text={PRODUCT_NAME}", timeout=15000)
    ok(f"Buyer can see product: '{PRODUCT_NAME}'")

    expect(page.locator("text=E2E Brand")).to_be_visible()
    ok("Brand 'E2E Brand' is visible to buyer ✔")

    # --------------------------------------------------------------
    print("\n")
    print("*" * 62)
    print("*   ALL E2E PLAYWRIGHT TESTS PASSED SUCCESSFULLY!  !    *")
    print("*" * 62)


if __name__ == "__main__":
    run()

