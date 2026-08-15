describe("Marketplace Lifecycle E2E", () => {
  const timestamp = Date.now();
  const sellerPhone = `999${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(7, "0")}`;
  const sellerEmail = `test.seller.${timestamp}@example.com`;
  const sellerPass = "Seller@12345";
  const sellerBusiness = `Test Business ${timestamp}`;

  const productName = `E2E Product ${timestamp}`;
  const productPrice = "499";
  const productSKU = `SKU-${timestamp}`;

  beforeEach(() => {
    // We clear localStorage to simulate fresh browser state for different users
    cy.clearLocalStorage();
  });

  it("Phase 1: Admin Operations & Seller Approval", () => {
    // 1. Create a seller via registration page
    cy.visit("/seller/register");
    cy.get('input[name="first_name"]').type("Test");
    cy.get('input[name="last_name"]').type("Seller");
    cy.get('input[name="phone"]').type(sellerPhone);
    cy.get('input[name="email"]').type(sellerEmail);
    cy.get('input[name="business_name"]').type(sellerBusiness);
    cy.get('input[name="gst_number"]').type("22AAAAA0000A1Z5");
    cy.get('input[name="pan_number"]').type("ABCDE1234F");
    cy.get('input[name="password"]').type(sellerPass);
    cy.get('input[name="confirmPassword"]').type(sellerPass);
    cy.get('button[type="submit"]').click();
    
    // Wait for redirect to login or success message
    cy.url().should('include', '/seller/login');

    // 2. Login as Admin
    cy.visit("/admin/login");
    cy.get('input[placeholder="Enter admin phone number"]').type("9000000002");
    cy.get('input[type="password"]').type("Admin@12345");
    cy.get('button[type="submit"]').click();

    // Verify redirect
    cy.url().should("include", "/admin/sellers");
    
    // Navigate to Sellers (already there usually, but just in case)
    cy.contains("a", "Sellers").click();
    cy.url().should("include", "/admin/sellers");

    // Search for our seller
    cy.get('input[placeholder="Search phone, email..."]').type(`${sellerPhone}`);
    // Assuming search filters as we type or wait a bit
    cy.wait(1000);
    
    // Find the row and click View
    cy.contains("tr", sellerPhone).contains("a", "View").click();
    
    // Click Approve
    cy.contains("button", "Approve").click();
    // Modal confirm
    cy.contains("button", "Confirm").click();
    
    // Wait for the success state and then verify it
    cy.wait(3000);
    cy.contains("Approved", { matchCase: false }).should("be.visible");
  });

  it("Phase 2: Seller Store Setup & Product Creation", () => {
    // Login as Seller
    cy.visit("/seller/login");
    cy.get('input[placeholder="Enter your phone number"]').type(sellerPhone);
    cy.get('input[type="password"]').type(sellerPass);
    cy.get('button[type="submit"]').click();

    // Verify dashboard
    cy.url().should("include", "/seller/dashboard");

    // Open Products & Add Product
    cy.contains("a", "Products").click();
    cy.contains("a", "New Product").click();

    // Fill out product form
    cy.get('input[name="name"]').type(productName);
    cy.get('input[name="brand"]').type("E2E Brand");
    cy.get('select[name="category"]').select(1); // Select first valid category
    cy.get('input[name="base_price"]').clear().type(productPrice);
    cy.get('input[name="tax_percentage"]').clear().type("18");
    cy.get('input[name="shipping_charge"]').clear().type("50");
    cy.get('textarea[name="description"]').clear().type("A realistic test product for E2E testing.");

    // Wait a little before saving
    cy.wait(500);
    cy.contains("button", "Create Product").click();

    cy.get('input[placeholder="Attribute name (e.g. Size, Color)"]').type("Size{enter}");
    cy.get('input[placeholder="Add Size value..."]').type("L{enter}");
    cy.contains("span", "L").should("be.visible");
    cy.get('input[placeholder="Add Size value..."]').type("XL{enter}");
    cy.contains("span", "XL").should("be.visible");

    cy.get('input[placeholder="Attribute name (e.g. Size, Color)"]').type("Color{enter}");
    cy.get('input[placeholder="Add Color value..."]').type("Red{enter}");
    cy.contains("span", "Red").should("be.visible");
    cy.get('input[placeholder="Add Color value..."]').type("Blue{enter}");
    cy.contains("span", "Blue").should("be.visible");

    // Type into the Generate Variants price input so the button enables
    cy.get('input[placeholder="499"]').clear().type(productPrice);

    cy.contains("button", "Generate Variants").click();
    
    // Wait for generation success
    cy.contains("Generated", { timeout: 10000 }).should("be.visible");
    
    // Go to product list
    cy.visit("/seller/products");
    
    // Verify product status = PENDING
    cy.contains("tr", productName).contains("PENDING").should("be.visible");
  });

  it("Phase 3: Product Approval", () => {
    // Login as SuperAdmin
    cy.visit("/admin/login");
    cy.get('input[placeholder="Enter admin phone number"]').type("9000000002");
    cy.get('input[type="password"]').type("Admin@12345");
    cy.get('button[type="submit"]').click();

    // Open Product Management
    cy.contains("a", "Products").click();
    cy.url().should("include", "/admin/products");

    // Find the newly created product
    cy.contains("tr", productName).contains("PENDING").should("be.visible");
    
    // Approve it
    cy.contains("tr", productName).contains("button", "Approve").click();

    // Verify status = APPROVED
    cy.contains("tr", productName).contains("APPROVED").should("be.visible");
  });

  it("Phase 4: Buyer", () => {
    // Login as Buyer
    cy.visit("/login");
    cy.get('input[placeholder="Enter your phone number"]').type("9000000004");
    cy.get('input[type="password"]').type("Buyer@12345");
    cy.get('button[type="submit"]').click();

    // Open marketplace
    cy.visit("/products");
    
    // Search/filter for the product
    // (Assuming a search box exists on /products)
    cy.get('input[placeholder="Search for products, brands and more..."]').type(`${productName}{enter}`);

    // Verify product appears
    cy.contains(productName).should("be.visible").click();

    // Verify product details
    cy.contains(productName, { timeout: 15000 }).should("be.visible");
    cy.contains("499", { timeout: 15000 }).should("be.visible");
    cy.contains("E2E Brand").should("be.visible");
  });
});
