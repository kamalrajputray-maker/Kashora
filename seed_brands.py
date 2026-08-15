import os
import django
import random
import uuid

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User, SellerProfile
from apps.catalog.models import Category, Product, ProductVariant, ProductAttribute, ProductAttributeValue
from apps.inventory.models import Inventory, InventoryTransaction

def seed():
    user, _ = User.objects.get_or_create(phone='+918888888888', defaults={'is_active': True, 'first_name': 'Brand', 'last_name': 'Seller'})
    seller, _ = SellerProfile.objects.get_or_create(user=user, defaults={'business_name': 'Official Brands Store', 'status': 'APPROVED'})
    
    cat_elec, _ = Category.objects.get_or_create(name='Electronics', slug='electronics')
    cat_shoes, _ = Category.objects.get_or_create(name='Footwear', slug='footwear')
    cat_beauty, _ = Category.objects.get_or_create(name='Beauty', slug='beauty')

    brands_data = [
        {'brand': 'Mi', 'cat': cat_elec, 'base_price': 1500, 'items': ['Smart Band 6', 'Power Bank 10000mAh', 'Earbuds Basic 2', 'Smart Speaker', 'Trimmer']},
        {'brand': 'Bata', 'cat': cat_shoes, 'base_price': 800, 'items': ['Formal Shoes', 'Casual Sneakers', 'Comfort Sandals', 'Running Shoes', 'Leather Loafers']},
        {'brand': 'Mamaearth', 'cat': cat_beauty, 'base_price': 300, 'items': ['Onion Shampoo', 'Ubtan Face Wash', 'Vitamin C Serum', 'Tea Tree Face Wash', 'Argan Hair Mask']},
        {'brand': 'Plum', 'cat': cat_beauty, 'base_price': 400, 'items': ['Green Tea Toner', 'Niacinamide Serum', 'Aloe Moisturizer', 'Body Mist', 'Cleansing Balm']},
        {'brand': 'Nivea', 'cat': cat_beauty, 'base_price': 150, 'items': ['Soft Moisturizer', 'Men Body Wash', 'Lip Balm', 'Body Lotion', 'Roll On Deodorant']},
        {'brand': 'Himalaya', 'cat': cat_beauty, 'base_price': 100, 'items': ['Neem Face Wash', 'Aloe Vera Gel', 'Lip Balm', 'Baby Powder', 'Anti-Dandruff Shampoo']},
        {'brand': 'WOW', 'cat': cat_beauty, 'base_price': 350, 'items': ['Apple Cider Vinegar Shampoo', 'Aloe Vera Gel', 'Vitamin C Face Cream', 'Hair Oil', 'Charcoal Face Wash']},
    ]

    for b in brands_data:
        for item_name in b['items']:
            full_name = f"{b['brand']} {item_name}"
            price = b['base_price'] + random.randint(10, 100)
            
            p, created = Product.objects.get_or_create(
                name=full_name,
                brand=b['brand'],
                defaults={
                    'seller': seller,
                    'category': b['cat'],
                    'description': f"Original {b['brand']} product: {item_name}. Great quality guaranteed.",
                    'base_price': price,
                    'tax_percentage': 18.00,
                    'shipping_charge': 0.00,
                    'status': 'ACTIVE',
                    'approval_status': 'APPROVED'
                }
            )
            
            attr, _ = ProductAttribute.objects.get_or_create(product=p, name='Size')
            val, _ = ProductAttributeValue.objects.get_or_create(attribute=attr, value='Standard')
            
            v, v_created = ProductVariant.objects.get_or_create(
                product=p,
                sku=f"SKU-{b['brand'].upper()}-{item_name.replace(' ', '').upper()}",
                defaults={'price': price, 'is_active': True}
            )
            v.attribute_values.add(val)
            
            inv, _ = Inventory.objects.get_or_create(
                variant=v,
                defaults={'available_quantity': 150}
            )
            if v_created:
                InventoryTransaction.objects.create(
                    inventory=inv,
                    transaction_type='STOCK_IN',
                    quantity=150,
                    notes='Initial Seed'
                )
            print(f"Created/Updated {full_name} by {b['brand']}")

if __name__ == '__main__':
    seed()
