from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, phone, email=None, password=None, **extra_fields):
        if not phone:
            raise ValueError("Phone number is required.")

        email = self.normalize_email(email) if email else None
        user = self.model(phone=phone, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("is_verified", False)
        return self._create_user(phone, email=email, password=password, **extra_fields)

    def create_superuser(self, phone, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_verified", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        user = self._create_user(phone, email=email, password=password, **extra_fields)

        from apps.accounts.models import Role, UserRole
        from apps.accounts.constants import RoleType

        try:
            role = Role.objects.get(name=RoleType.SUPER_ADMIN.value)
        except Role.DoesNotExist:
            role = Role.objects.create(name=RoleType.SUPER_ADMIN.value)

        UserRole.objects.get_or_create(user=user, role=role, defaults={"is_primary": True})
        return user
