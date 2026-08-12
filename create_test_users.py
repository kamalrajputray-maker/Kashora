from django.contrib.auth import get_user_model
from apps.accounts.models import SellerProfile, Role, UserRole

User = get_user_model()

def ensure_user(phone, email, password, role_name, first='Test', last='User', **extra):
    user, created = User.objects.get_or_create(
        phone=phone,
        defaults=dict(email=email, first_name=first, last_name=last, is_verified=True, **extra)
    )
    if created:
        user.set_password(password)
        user.save()
    else:
        # Update password to ensure it's set correctly
        user.set_password(password)
        user.is_verified = True
        user.save()
    role = Role.objects.get(name=role_name)
    UserRole.objects.get_or_create(user=user, role=role, defaults={'is_primary': True})
    print(f'  [{role_name}] phone={phone}  password={password}  -> {"created" if created else "exists"}')
    return user


print('Creating test users...')

# SuperAdmin
ensure_user('9000000001', 'superadmin@kashora.com', 'Admin@12345', 'SUPER_ADMIN', first='Super', last='Admin')

# Admin
ensure_user('9000000002', 'admin@kashora.com', 'Admin@12345', 'ADMIN', first='Admin', last='User')

# Seller (with SellerProfile)
seller = ensure_user('9000000003', 'seller@kashora.com', 'Seller@12345', 'SELLER', first='Rahul', last='Sharma')
sp, _ = SellerProfile.objects.get_or_create(
    user=seller,
    defaults=dict(
        business_name='Rahul Store',
        store_name='Rahul Store',
        gst_number='GST9000000003',
        pan_number='PAN9000000003',
        status='APPROVED',
    )
)

# Buyer
ensure_user('9000000004', 'buyer@kashora.com', 'Buyer@12345', 'BUYER', first='Priya', last='Singh')

print('All test users ready.')
