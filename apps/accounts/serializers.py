import re

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.constants import RoleType
from apps.accounts.models import Address, AdminProfile, BuyerProfile, Permission, Role, SellerProfile, UserRole

User = get_user_model()


class PhoneValidator:
    @staticmethod
    def validate_phone(value):
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        digits = re.sub(r"\D", "", str(value))
        if len(digits) < 10:
            raise serializers.ValidationError("Phone number must contain at least 10 digits.")
        return value


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "phone",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_verified",
        ]
        read_only_fields = ["id", "role", "is_verified"]

    def get_role(self, obj):
        primary_role = obj.primary_role
        return primary_role.role.name if primary_role else None


class BuyerRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "phone",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
        ]

    def validate_phone(self, value):
        return PhoneValidator.validate_phone(value)

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if User.objects.filter(phone=attrs["phone"]).exists():
            raise serializers.ValidationError({"phone": "A user with this phone already exists."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            is_verified=True,
            **validated_data,
        )
        buyer_role = Role.objects.get(name=RoleType.BUYER.value)
        UserRole.objects.create(user=user, role=buyer_role, is_primary=True)
        BuyerProfile.objects.create(user=user)
        return user


class SellerRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    business_name = serializers.CharField(required=True)
    gst_number = serializers.CharField(required=True)
    pan_number = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = [
            "phone",
            "email",
            "password",
            "first_name",
            "last_name",
            "business_name",
            "gst_number",
            "pan_number",
        ]

    def validate_phone(self, value):
        return PhoneValidator.validate_phone(value)

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if User.objects.filter(phone=attrs["phone"]).exists():
            raise serializers.ValidationError({"phone": "A user with this phone already exists."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        business_name = validated_data.pop("business_name")
        gst_number = validated_data.pop("gst_number")
        pan_number = validated_data.pop("pan_number")

        user = User.objects.create_user(
            password=password,
            is_verified=True,
            **validated_data,
        )
        seller_role = Role.objects.get(name=RoleType.SELLER.value)
        UserRole.objects.create(user=user, role=seller_role, is_primary=True)
        SellerProfile.objects.create(
            user=user,
            business_name=business_name,
            gst_number=gst_number,
            pan_number=pan_number,
            status="PENDING",
        )
        return user


class AdminCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["phone", "email", "first_name", "last_name", "password"]

    def validate_phone(self, value):
        return PhoneValidator.validate_phone(value)

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if User.objects.filter(phone=attrs["phone"]).exists():
            raise serializers.ValidationError({"phone": "A user with this phone already exists."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, is_verified=True, **validated_data)
        admin_role = Role.objects.get(name=RoleType.ADMIN.value)
        UserRole.objects.create(user=user, role=admin_role, is_primary=True)
        AdminProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField(required=False, allow_blank=True)
    email = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        phone = attrs.get("phone")
        email = attrs.get("email")
        password = attrs.get("password")

        if not phone and not email:
            raise serializers.ValidationError("Either phone or email is required.")

        user = None
        if phone:
            user = User.objects.filter(phone=phone).first()
        if not user and email:
            user = User.objects.filter(email=email).first()

        if user is None or not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials.")

        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")

        refresh = RefreshToken.for_user(user)
        attrs["user"] = user
        attrs["refresh"] = refresh
        return attrs


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "description", "created_at", "updated_at"]
        read_only_fields = fields


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description", "created_at", "updated_at"]
        read_only_fields = fields


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "user",
            "name",
            "phone",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
