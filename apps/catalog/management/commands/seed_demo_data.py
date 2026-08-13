import random
import uuid
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.accounts.models import (
    User,
    Role,
    UserRole,
    BuyerProfile,
    SellerProfile,
    AdminProfile,
    Address,
)
from apps.catalog.models import (
    Category,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductVariant,
)


class Command(BaseCommand):
    help = "Seeds the database with realistic synthetic demo data"

    @transaction.atomic
    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding demo data...")

        # Ensure Roles exist
        roles = {}
        for role_name in ["SUPER_ADMIN", "ADMIN", "SELLER", "BUYER"]:
            role, _ = Role.objects.get_or_create(name=role_name)
            roles[role_name] = role

        # Generate Users helper
        def ensure_user(phone, email, password, role_name, first_name, last_name):
            user, created = User.objects.get_or_create(
                phone=phone,
                defaults={
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_verified": True,
                    "is_staff": role_name in ["SUPER_ADMIN", "ADMIN"],
                    "is_superuser": role_name == "SUPER_ADMIN",
                },
            )
            if created:
                user.set_password(password)
                user.save()
            else:
                user.first_name = first_name
                user.last_name = last_name
                user.email = email
                user.is_staff = role_name in ["SUPER_ADMIN", "ADMIN"]
                user.is_superuser = role_name == "SUPER_ADMIN"
                user.save()
            
            UserRole.objects.get_or_create(user=user, role=roles[role_name], defaults={"is_primary": True})
            return user, created

        # 1. SUPER ADMIN
        sa, sa_created = ensure_user(
            "9000000001", "superadmin@demo.local", "Demo@12345", "SUPER_ADMIN", "System", "Administrator"
        )
        super_admin_count = 1 if sa_created else 0

        # 2. ADMINS
        admin_data = [
            ("9000000011", "catalog.admin@demo.local", "Catalog Admin", "Operations"),
            ("9000000012", "seller.admin@demo.local", "Seller Admin", "Operations"),
            ("9000000013", "support.admin@demo.local", "Support Admin", "Customer Service"),
            ("9000000014", "order.admin@demo.local", "Order Admin", "Fulfillment"),
            ("9000000015", "finance.admin@demo.local", "Finance Admin", "Finance"),
        ]
        admin_count = 0
        for phone, email, name, dept in admin_data:
            first, last = name.split(" ")
            user, created = ensure_user(phone, email, "Demo@12345", "ADMIN", first, last)
            AdminProfile.objects.get_or_create(user=user, defaults={"department": dept})
            if created:
                admin_count += 1

        # 3. SELLERS
        seller_data = [
            ("Urban Threads", "Urban Threads Fashion", "9000000101", "seller1@demo.local", "APPROVED"),
            ("StyleKart Fashion", "StyleKart Pvt Ltd", "9000000102", "seller2@demo.local", "APPROVED"),
            ("Riya Home Collection", "Riya Home LLC", "9000000103", "seller3@demo.local", "APPROVED"),
            ("Smart Choice Electronics", "Smart Choice Tech", "9000000104", "seller4@demo.local", "APPROVED"),
            ("TrendAura Official", "TrendAura Clothing", "9000000105", "seller5@demo.local", "APPROVED"),
            ("DailyWear Hub", "DailyWear Textiles", "9000000106", "seller6@demo.local", "PENDING"),
            ("HomeNest Store", "HomeNest Decor", "9000000107", "seller7@demo.local", "APPROVED"),
            ("Glow & Care", "Glow Beauty Products", "9000000108", "seller8@demo.local", "APPROVED"),
            ("Kids Corner", "Kids Corner Toys", "9000000109", "seller9@demo.local", "SUSPENDED"),
            ("Comfort Footwear", "Comfort Shoes Inc", "9000000110", "seller10@demo.local", "APPROVED"),
        ]
        seller_count = 0
        seller_profiles = []
        for store, business, phone, email, status in seller_data:
            user, created = ensure_user(phone, email, "Demo@12345", "SELLER", store.split()[0], "Store")
            profile, _ = SellerProfile.objects.get_or_create(
                user=user,
                defaults={
                    "store_name": store,
                    "store_description": f"Quality products from {store}. Affordable and trendy.",
                    "business_name": business,
                    "business_email": email,
                    "business_phone": phone,
                    "address_line_1": "Shop No 101, Main Market",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "postal_code": "400001",
                    "country": "India",
                    "gst_number": f"27AAAAA{phone}1Z",
                    "pan_number": f"AAAA{phone[-4:]}A",
                    "status": status,
                    "kyc_status": "APPROVED" if status == "APPROVED" else "PENDING",
                },
            )
            seller_profiles.append(profile)
            if created:
                seller_count += 1

        # 4. BUYERS
        buyer_names = [
            "Aarav Sharma", "Riya Verma", "Priya Patel", "Rahul Mehta", "Ananya Singh",
            "Karan Joshi", "Neha Gupta", "Rohit Mishra", "Sneha Jain", "Vikram Yadav",
            "Aditi Desai", "Arjun Nair", "Kavya Reddy", "Rohan Iyer", "Simran Kaur",
            "Kabir Das", "Tara Sengupta", "Dev Kapoor", "Nisha Pillai", "Ishaan Bhat",
            "Meera Menon", "Varun Chauhan", "Pooja Trivedi", "Ayush Malik", "Sanya Rao",
            "Dhruv Ahuja", "Ritika Saxena", "Samar Thakur", "Tanvi Bhatia", "Aman Mathur",
            "Kiara Bajaj", "Yash Agarwal", "Shruti Pandey", "Kunal Dixit", "Anjali Garg",
        ]
        cities = ["Raipur", "Bhilai", "Nagpur", "Indore", "Bhopal", "Delhi", "Mumbai", "Pune", "Bengaluru", "Hyderabad", "Kolkata", "Jaipur", "Lucknow"]
        buyer_count = 0
        for i, name in enumerate(buyer_names):
            first, last = name.split(" ")
            phone = f"9000000{200 + i}"
            email = f"buyer{i+1}@demo.local"
            user, created = ensure_user(phone, email, "Demo@12345", "BUYER", first, last)
            BuyerProfile.objects.get_or_create(user=user)
            if created:
                buyer_count += 1
                # Create Addresses
                for j in range(random.randint(1, 3)):
                    Address.objects.get_or_create(
                        user=user,
                        name=name,
                        phone=phone,
                        address_line_1=f"Flat {random.randint(10, 999)}, Green Residency",
                        address_line_2=f"{random.choice(['MG Road', 'Station Road', 'Civil Lines', 'Phase 1'])}",
                        city=random.choice(cities),
                        state="Demo State",
                        postal_code=f"{random.randint(100, 999)}000",
                        country="India",
                        is_default=(j == 0),
                    )

        # 5. CATEGORIES
        category_names = [
            "Women Ethnic", "Kurtis", "Sarees", "Dress Materials", "Dupattas",
            "Women Western", "Dresses", "Tops", "Jeans", "T-Shirts",
            "Men Clothing", "Men T-Shirts", "Shirts", "Trousers", "Activewear",
            "Men Footwear", "Casual Shoes", "Formal Shoes", "Sneakers",
            "Home & Kitchen", "Kitchen Storage", "Bedsheets", "Home Decor",
            "Beauty & Personal Care", "Bags & Accessories"
        ]
        cat_count = 0
        categories = []
        for cat_name in category_names:
            cat, created = Category.objects.get_or_create(
                name=cat_name,
                defaults={"description": f"Shop the best {cat_name} at unbeatable prices."}
            )
            categories.append(cat)
            if created:
                cat_count += 1

        # 6. PRODUCTS, ATTRIBUTES, AND VARIANTS
        product_count = 0
        variant_count = 0
        active_sellers = [sp for sp in seller_profiles if sp.status == "APPROVED"]
        
        brands = ["UrbanVibe", "StyleNest", "HomeEase", "Trendora", "DailyCraft", "SmartLiving", "GlowPure", "ComfortLine", "KidsJoy", "TechMate"]

        for i in range(1, 101):
            name = f"Demo Product {i} - Premium Quality"
            slug = f"demo-product-{i}-premium"
            
            # Use filter check for idempotency
            product = Product.objects.filter(slug=slug).first()
            if not product:
                cat = random.choice(categories)
                seller = random.choice(active_sellers)
                brand = random.choice(brands)
                
                base_price = Decimal(random.randint(299, 1999))
                compare_at_price = base_price + Decimal(random.randint(100, 500))
                
                product = Product.objects.create(
                    seller=seller,
                    category=cat,
                    name=name,
                    slug=slug,
                    description=f"Comfortable everyday {cat.name} featuring premium quality materials. Suitable for regular use. 100% genuine product by {brand}.",
                    brand=brand,
                    base_price=base_price,
                    compare_at_price=compare_at_price,
                    tax_percentage=Decimal("12.00"),
                    shipping_charge=Decimal("40.00"),
                    returnable=True,
                    return_window_days=7,
                    status="ACTIVE",
                    approval_status="APPROVED"
                )
                product_count += 1

            # Seed Attributes and Variants for this product if they don't exist yet
            if product.variants.count() == 0:
                is_clothing = any(k in product.category.name.lower() for k in ["clothing", "ethnic", "western", "kurtis", "sarees", "t-shirts", "shirts", "trousers"])
                is_footwear = any(k in product.category.name.lower() for k in ["footwear", "shoes", "sneakers"])
                
                if is_clothing:
                    # Size Attribute
                    size_attr, _ = ProductAttribute.objects.get_or_create(product=product, name="Size")
                    sizes = ["S", "M", "L", "XL"]
                    size_vals = [ProductAttributeValue.objects.get_or_create(attribute=size_attr, value=s)[0] for s in sizes]
                    
                    # Color Attribute
                    color_attr, _ = ProductAttribute.objects.get_or_create(product=product, name="Color")
                    colors = ["Black", "Blue", "Pink", "Maroon"]
                    color_vals = [ProductAttributeValue.objects.get_or_create(attribute=color_attr, value=c)[0] for c in colors]
                    
                    # Generate Variants (2 sizes x 2 colors = 4 variants)
                    chosen_sizes = random.sample(size_vals, 2)
                    chosen_colors = random.sample(color_vals, 2)
                    for s_val in chosen_sizes:
                        for c_val in chosen_colors:
                            sku = f"{product.seller.store_name[:3].upper()}-{product.brand[:3].upper()}-CL-{str(uuid.uuid4())[:8].upper()}"
                            variant = ProductVariant.objects.create(
                                product=product,
                                sku=sku,
                                price=product.base_price,
                                compare_at_price=product.compare_at_price,
                                is_active=True
                            )
                            variant.attribute_values.set([s_val, c_val])
                            variant_count += 1
                elif is_footwear:
                    size_attr, _ = ProductAttribute.objects.get_or_create(product=product, name="Size")
                    sizes = ["7", "8", "9", "10"]
                    size_vals = [ProductAttributeValue.objects.get_or_create(attribute=size_attr, value=s)[0] for s in sizes]
                    
                    color_attr, _ = ProductAttribute.objects.get_or_create(product=product, name="Color")
                    colors = ["Black", "Brown", "Grey"]
                    color_vals = [ProductAttributeValue.objects.get_or_create(attribute=color_attr, value=c)[0] for c in colors]
                    
                    chosen_sizes = random.sample(size_vals, 2)
                    chosen_colors = random.sample(color_vals, 2)
                    for s_val in chosen_sizes:
                        for c_val in chosen_colors:
                            sku = f"{product.seller.store_name[:3].upper()}-{product.brand[:3].upper()}-FW-{str(uuid.uuid4())[:8].upper()}"
                            variant = ProductVariant.objects.create(
                                product=product,
                                sku=sku,
                                price=product.base_price + Decimal("50.00"),
                                compare_at_price=product.compare_at_price + Decimal("50.00"),
                                is_active=True
                            )
                            variant.attribute_values.set([s_val, c_val])
                            variant_count += 1
                else:
                    # General item with simple Variant style
                    style_attr, _ = ProductAttribute.objects.get_or_create(product=product, name="Style")
                    styles = ["Standard", "Premium"]
                    style_vals = [ProductAttributeValue.objects.get_or_create(attribute=style_attr, value=st)[0] for st in styles]
                    
                    for st_val in style_vals:
                        sku = f"{product.seller.store_name[:3].upper()}-{product.brand[:3].upper()}-GN-{str(uuid.uuid4())[:8].upper()}"
                        variant = ProductVariant.objects.create(
                            product=product,
                            sku=sku,
                            price=product.base_price if st_val.value == "Standard" else product.base_price + Decimal("150.00"),
                            compare_at_price=product.compare_at_price if st_val.value == "Standard" else product.compare_at_price + Decimal("150.00"),
                            is_active=True
                        )
                        variant.attribute_values.set([st_val])
                        variant_count += 1
            else:
                variant_count += product.variants.count()

        self.stdout.write("\n========================================")
        self.stdout.write("DEMO DATA CREATED")
        self.stdout.write("========================================\n")
        
        self.stdout.write("Users")
        self.stdout.write("----------------")
        self.stdout.write(f"Super Admin:       {super_admin_count}")
        self.stdout.write(f"Admins:            {admin_count}")
        self.stdout.write(f"Sellers:           {seller_count}")
        self.stdout.write(f"Buyers:            {buyer_count}\n")
        
        self.stdout.write("Marketplace")
        self.stdout.write("----------------")
        self.stdout.write(f"Stores:            {seller_count}")
        self.stdout.write(f"Categories:        {cat_count}")
        self.stdout.write(f"Brands:            {len(brands)} (embedded in products)")
        self.stdout.write(f"Products:          {product_count}\n")
        
        self.stdout.write("Commerce")
        self.stdout.write("----------------")
        self.stdout.write(f"Variants:          {variant_count}")
        self.stdout.write("Inventory:         N/A (Not implemented)")
        self.stdout.write("Orders:            N/A (Not implemented)")
        self.stdout.write("Reviews:           N/A (Not implemented)")
        self.stdout.write("Payments:          N/A (Not implemented)\n")
        
        self.stdout.write("========================================")
        self.stdout.write("SUCCESS")
        self.stdout.write("========================================\n")
