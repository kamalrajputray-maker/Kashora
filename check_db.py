import os
import django
import sys

# Setup Django
sys.path.append('c:\\XAMPP\\boss\\meesho-clone\\Kashora')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.catalog.models import Product, ProductVariant

products = Product.objects.filter(name__startswith='E2E Product').order_by('-created_at')[:1]
if not products.exists():
    print("No E2E Product found.")
    sys.exit(0)

p = products[0]
print(f"Product: {p.name}")
print(f"Status: {p.status}, Approval: {p.approval_status}, Base Price: {p.base_price}")
print(f"Variants count: {p.variants.count()}")
for v in p.variants.all():
    print(f"  Variant: {v.sku}, Price: {v.price}, Active: {v.is_active}")
