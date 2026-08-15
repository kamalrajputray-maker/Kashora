import os
import django
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User, SellerProfile
from apps.catalog.models import Category, Product, ProductVariant, ProductAttribute, ProductAttributeValue
from apps.inventory.models import Inventory, InventoryTransaction

def seed():
    # 1. Get or create a seller
    user, _ = User.objects.get_or_create(phone='+917777777777', defaults={'is_active': True, 'first_name': 'Category', 'last_name': 'Seller'})
    seller, _ = SellerProfile.objects.get_or_create(user=user, defaults={'business_name': 'Category Specialist Store', 'status': 'APPROVED'})
    
    # 2. Get categories
    cat_women, _ = Category.objects.get_or_create(name='Women', slug='women')
    cat_men, _ = Category.objects.get_or_create(name='Men', slug='men')

    products_data = [
        # Lehengas (category: women)
        {'name': 'Designer Floral Lehenga', 'brand': 'Kashora Couture', 'cat': cat_women, 'price': 4999},
        {'name': 'Bridal Red Lehenga Choli', 'brand': 'Royal Ethnic', 'cat': cat_women, 'price': 12999},
        {'name': 'Georgette Embroidered Lehenga', 'brand': 'FabIndia', 'cat': cat_women, 'price': 3499},
        {'name': 'Net Mirror Work Lehenga', 'brand': 'Libas', 'cat': cat_women, 'price': 2599},
        {'name': 'Silk Party Wear Lehenga', 'brand': 'Biba', 'cat': cat_women, 'price': 5999},
        
        # Sarees (category: women)
        {'name': 'Banarasi Silk Saree', 'brand': 'Mimosa', 'cat': cat_women, 'price': 1999},
        {'name': 'Kanjeevaram Wedding Saree', 'brand': 'Pothys', 'cat': cat_women, 'price': 4599},
        {'name': 'Cotton Printed Daily Wear Saree', 'brand': 'Suta', 'cat': cat_women, 'price': 999},
        {'name': 'Georgette Ruffle Saree', 'brand': 'Indya', 'cat': cat_women, 'price': 1499},
        {'name': 'Chiffon Party Saree', 'brand': 'Satya Paul', 'cat': cat_women, 'price': 3999},
        
        # Menswear (category: men)
        {'name': 'Slim Fit Casual Shirt', 'brand': 'Peter England', 'cat': cat_men, 'price': 899},
        {'name': 'Men Classic Fit T-Shirt', 'brand': 'Puma', 'cat': cat_men, 'price': 599},
        {'name': 'Formal Trousers', 'brand': 'Raymond', 'cat': cat_men, 'price': 1499},
        {'name': 'Denim Jacket', 'brand': 'Levi\'s', 'cat': cat_men, 'price': 2499},
        {'name': 'Ethnic Kurta Pajama Set', 'brand': 'Manyavar', 'cat': cat_men, 'price': 2999},
    ]

    for data in products_data:
        p, created = Product.objects.get_or_create(
            name=data['name'],
            brand=data['brand'],
            defaults={
                'seller': seller,
                'category': data['cat'],
                'description': f"Beautiful {data['name']} by {data['brand']}. Excellent quality and design.",
                'base_price': data['price'],
                'tax_percentage': 12.00,
                'shipping_charge': 0.00,
                'status': 'ACTIVE',
                'approval_status': 'APPROVED'
            }
        )
        
        # Create attribute
        attr, _ = ProductAttribute.objects.get_or_create(product=p, name='Size')
        val, _ = ProductAttributeValue.objects.get_or_create(attribute=attr, value='Standard')
        
        # Create variant
        v, v_created = ProductVariant.objects.get_or_create(
            product=p,
            sku=f"SKU-{data['name'].replace(' ', '-').upper()}",
            defaults={'price': data['price'], 'is_active': True}
        )
        v.attribute_values.add(val)
        
        # Create Inventory
        inv, _ = Inventory.objects.get_or_create(
            variant=v,
            defaults={'available_quantity': 200}
        )
        if v_created:
            InventoryTransaction.objects.create(
                inventory=inv,
                transaction_type='STOCK_IN',
                quantity=200,
                notes='Category Seed'
            )
        else:
            # Force update inventory if it already exists to ensure it's in stock
            inv.available_quantity = 200
            inv.save()
            
        print(f"Created/Updated {data['name']} by {data['brand']}")

if __name__ == '__main__':
    seed()
