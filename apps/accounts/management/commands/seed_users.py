import os

from django.core.management.base import BaseCommand

from apps.accounts.constants import RoleType
from apps.accounts.models import AdminProfile, BuyerProfile, SellerProfile, Role, User, UserRole


class Command(BaseCommand):
    help = "Seed development users. This command is intended only for non-production environments."

    def handle(self, *args, **options):
        if os.getenv("DJANGO_ENV") == "production":
            self.stderr.write(self.style.ERROR("This command is disabled in production."))
            return

        if not Role.objects.filter(name=RoleType.SUPER_ADMIN.value).exists():
            self.call_command("seed_roles")

        users = [
            {
                "phone": "9000000001",
                "email": "superadmin.dev@example.com",
                "password": "StrongPassword123",
                "first_name": "Dev",
                "last_name": "SuperAdmin",
                "role": RoleType.SUPER_ADMIN.value,
                "is_staff": True,
                "is_superuser": True,
                "is_verified": True,
            },
            {
                "phone": "9000000002",
                "email": "admin.dev@example.com",
                "password": "StrongPassword123",
                "first_name": "Dev",
                "last_name": "Admin",
                "role": RoleType.ADMIN.value,
                "is_verified": True,
            },
            {
                "phone": "9000000003",
                "email": "seller.dev@example.com",
                "password": "StrongPassword123",
                "first_name": "Dev",
                "last_name": "Seller",
                "role": RoleType.SELLER.value,
                "is_verified": True,
            },
            {
                "phone": "9000000004",
                "email": "buyer.dev@example.com",
                "password": "StrongPassword123",
                "first_name": "Dev",
                "last_name": "Buyer",
                "role": RoleType.BUYER.value,
                "is_verified": True,
            },
        ]

        for payload in users:
            user, created = User.objects.get_or_create(
                phone=payload["phone"],
                defaults={
                    "email": payload["email"],
                    "first_name": payload["first_name"],
                    "last_name": payload["last_name"],
                    "is_staff": payload.get("is_staff", False),
                    "is_superuser": payload.get("is_superuser", False),
                    "is_verified": payload.get("is_verified", False),
                },
            )
            if created:
                user.set_password(payload["password"])
                user.save()

            role = Role.objects.get(name=payload["role"])
            UserRole.objects.update_or_create(user=user, role=role, defaults={"is_primary": True})

            if payload["role"] == RoleType.SUPER_ADMIN.value:
                user.is_staff = True
                user.is_superuser = True
                user.save(update_fields=["is_staff", "is_superuser"])
            if payload["role"] == RoleType.ADMIN.value:
                AdminProfile.objects.get_or_create(user=user)
            if payload["role"] == RoleType.SELLER.value:
                SellerProfile.objects.get_or_create(user=user, defaults={"business_name": "Dev Store", "gst_number": "GSTDEV123", "pan_number": "PANDEV123", "seller_status": "PENDING"})
            if payload["role"] == RoleType.BUYER.value:
                BuyerProfile.objects.get_or_create(user=user)

        self.stdout.write(self.style.SUCCESS("Development users ensured."))
