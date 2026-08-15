/**
 * Kashora Full Marketplace Lifecycle - E2E (Cypress / Browser)
 *
 * Phases that mirror e2e_test.py, but run *in a real browser*:
 *   Phase 1a - Seller Registration
 *   Phase 1b - Admin logs in & approves seller
 *   Phase 2a - Seller logs in
 *   Phase 2b - Seller creates product (status -> PENDING)
 *   Phase 3a - Admin approves product
 *   Phase 3b - Buyer sees approved product
 *
 * Run headlessly  :  npm run e2e
 * Run in browser  :  npm run e2e:open      <- USE THIS TO SEE THE BROWSER
 */

const API = "http://localhost:8000/api/v1";

const ts = Date.now();
const SELLER_PHONE = `999${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)}`;
const SELLER_EMAIL = `seller_${ts}@test.com`;
const SELLER_PASS  = "testpass123";
const PRODUCT_NAME = `E2E Product ${ts}`;
const PRODUCT_PRICE = "999";

describe("Kashora - Full Marketplace Lifecycle", () => {

  // Phase 1a: Seller Registration
  it("Phase 1a | Seller registers via /seller/register", () => {
    cy.visit("/seller/register");
    cy.log(`Registering seller with phone: ${SELLER_PHONE}`);

    cy.get('input[name="first_name"]').type("Test");
    cy.get('input[name="last_name"]').type("Seller");
    cy.get('input[name="phone"]').type(SELLER_PHONE);
    cy.get('input[name="email"]').type(SELLER_EMAIL);
    cy.get('input[name="business_name"]').type(`Test Business ${ts}`);
    cy.get('input[name="gst_number"]').type("22AAAAA0000A1Z5");
    cy.get('input[name="pan_number"]').type("ABCDE1234F");
    cy.get('input[name="password"]').type(SELLER_PASS);
    cy.get('input[name="confirmPassword"]').type(SELLER_PASS);

    cy.get('button[type="submit"]').click();
    cy.url({ timeout: 15000 }).should("include", "/seller/login");
    cy.log("PASS - Seller registered successfully");
  });

  // Phase 1b: Admin approves seller
  it("Phase 1b | Admin logs in and approves the new seller", () => {
    cy.visit("/admin/login");
    cy.log("Admin logging in...");

    cy.get('input[placeholder="Enter admin phone number"]').type("9000000002");
    cy.get('input[type="password"]').type("Admin@12345");
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 15000 }).should("include", "/admin");
    cy.log("PASS - Admin logged in");

    cy.contains("a", "Sellers").click();
    cy.url().should("include", "/admin/sellers");

    cy.get('input[placeholder="Search phone, email..."]').type(SELLER_PHONE);
    cy.wait(1500);

    cy.contains("tr", SELLER_PHONE).contains("a", "View").click();
    cy.log("Opened seller profile");

    cy.contains("button", "Approve").click();
    cy.contains("button", "Confirm").click();

    cy.wait(2000);
    cy.contains("Approved", { matchCase: false, timeout: 10000 }).should("be.visible");
    cy.log("PASS - Seller approved by admin");
  });

  // Phase 2a: Seller login
  it("Phase 2a | Seller logs in and reaches the dashboard", () => {
    cy.visit("/seller/login");
    cy.log(`Seller logging in with phone: ${SELLER_PHONE}`);

    cy.get('input[placeholder="Enter your phone number"]').type(SELLER_PHONE);
    cy.get('input[type="password"]').type(SELLER_PASS);
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 15000 }).should("include", "/seller/dashboard");
    cy.log("PASS - Seller on dashboard");
  });

  // Phase 2b: Seller creates product
  it("Phase 2b | Seller creates a product (status -> PENDING)", () => {
    cy.visit("/seller/login");
    cy.get('input[placeholder="Enter your phone number"]').type(SELLER_PHONE);
    cy.get('input[type="password"]').type(SELLER_PASS);
    cy.get('button[type="submit"]').click();
    cy.url({ timeout: 15000 }).should("include", "/seller/dashboard");

    cy.contains("a", "Products").click();
    cy.contains("a", "New Product").click();
    cy.log("Filling product form...");

    cy.get('input[name="name"]').type(PRODUCT_NAME);
    cy.get('input[name="brand"]').type("E2E Brand");
    cy.get('select[name="category"]').select(1);
    cy.get('input[name="base_price"]').clear().type(PRODUCT_PRICE);
    cy.get('input[name="tax_percentage"]').clear().type("18");
    cy.get('input[name="shipping_charge"]').clear().type("50");
    cy.get('textarea[name="description"]').clear().type(
      "A product created automatically by the E2E browser test."
    );

    cy.contains("button", "Create Product").click();
    cy.log("Product form submitted");

    cy.get('input[placeholder="Attribute name (e.g. Size, Color)"]').type("Size{enter}");
    cy.get('input[placeholder="Add Size value..."]').type("L{enter}");
    cy.contains("span", "L").should("be.visible");
    cy.get('input[placeholder="Add Size value..."]').type("XL{enter}");
    cy.contains("span", "XL").should("be.visible");

    cy.get('input[placeholder="Attribute name (e.g. Size, Color)"]').type("Color{enter}");
    cy.get('input[placeholder="Add Color value..."]').type("Red{enter}");
    cy.contains("span", "Red").should("be.visible");

    cy.get('input[placeholder="499"]').clear().type(PRODUCT_PRICE);
    cy.contains("button", "Generate Variants").click();
    cy.contains("Generated", { timeout: 10000 }).should("be.visible");
    cy.log("PASS - Variants generated");

    cy.visit("/seller/products");
    cy.contains("tr", PRODUCT_NAME).contains("PENDING").should("be.visible");
    cy.log("PASS - Product is in PENDING state");
  });

  // Phase 3a: Admin approves product
  it("Phase 3a | Admin approves the product", () => {
    cy.visit("/admin/login");
    cy.get('input[placeholder="Enter admin phone number"]').type("9000000002");
    cy.get('input[type="password"]').type("Admin@12345");
    cy.get('button[type="submit"]').click();
    cy.url({ timeout: 15000 }).should("include", "/admin");

    cy.contains("a", "Products").click();
    cy.url().should("include", "/admin/products");
    cy.log("Looking for PENDING product...");

    cy.contains("tr", PRODUCT_NAME).contains("PENDING").should("be.visible");
    cy.contains("tr", PRODUCT_NAME).contains("button", "Approve").click();

    cy.contains("tr", PRODUCT_NAME)
      .contains("APPROVED", { timeout: 10000 })
      .should("be.visible");
    cy.log("PASS - Product approved by admin");
  });

  // Phase 3b: Buyer sees the product
  it("Phase 3b | Buyer can see the approved product in marketplace", () => {
    cy.visit("/products");
    cy.log(`Buyer searching for: ${PRODUCT_NAME}`);

    cy.get('input[placeholder="Search for products, brands and more..."]')
      .type(`${PRODUCT_NAME}{enter}`);

    cy.contains(PRODUCT_NAME, { timeout: 15000 }).should("be.visible").click();
    cy.contains(PRODUCT_NAME, { timeout: 15000 }).should("be.visible");
    cy.contains(PRODUCT_PRICE, { timeout: 10000 }).should("be.visible");
    cy.contains("E2E Brand").should("be.visible");
    cy.log("PASS - Buyer can see product - ALL PHASES COMPLETE!");
  });

});
