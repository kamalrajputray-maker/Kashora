import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):

    def create_user(self, phone, password=None, **extra_fields):

        if not phone:
            raise ValueError("Phone number is required")

        user = self.model(
            phone=phone,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, phone, password=None, **extra_fields):

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        return self.create_user(
            phone,
            password,
            **extra_fields
        )


class User(AbstractBaseUser, PermissionsMixin):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    phone = models.CharField(
        max_length=15,
        unique=True
    )

    email = models.EmailField(
        unique=True,
        null=True,
        blank=True
    )

    first_name = models.CharField(
        max_length=100,
        blank=True
    )

    last_name = models.CharField(
        max_length=100,
        blank=True
    )

    is_active = models.BooleanField(default=True)

    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "phone"

    def __str__(self):
        return self.phone