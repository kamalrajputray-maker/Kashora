from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import SellerProfile

User = get_user_model()


class SellerProfileSerializer(serializers.ModelSerializer):
    """Serializer for seller profile information"""

    user_phone = serializers.CharField(source="user.phone", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "user_phone",
            "user_email",
            "user_first_name",
            "user_last_name",
            # Store Information
            "store_name",
            "store_description",
            "store_logo",
            "store_banner",
            # Business Information
            "business_name",
            "business_email",
            "business_phone",
            # Address Information
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            # Tax Information
            "gst_number",
            "pan_number",
            # Status Fields
            "kyc_status",
            "status",
            "status_display",
            # Rejection Information
            "rejection_reason",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_phone",
            "user_email",
            "user_first_name",
            "user_last_name",
            "status",
            "kyc_status",
            "rejection_reason",
            "status_display",
            "created_at",
            "updated_at",
        ]


class SellerProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating seller profile by seller"""

    class Meta:
        model = SellerProfile
        fields = [
            # Store Information
            "store_name",
            "store_description",
            "store_logo",
            "store_banner",
            # Business Information
            "business_name",
            "business_email",
            "business_phone",
            # Address Information
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
        ]

    def validate_business_email(self, value):
        """Validate business email is unique"""
        if value:
            seller_id = self.instance.id if self.instance else None
            if SellerProfile.objects.filter(business_email=value).exclude(id=seller_id).exists():
                raise serializers.ValidationError("A seller with this business email already exists.")
        return value

    def validate_gst_number(self, value):
        """Validate GST number format (basic validation)"""
        if value and len(value) < 10:
            raise serializers.ValidationError("GST number must be at least 10 characters.")
        return value

    def validate_pan_number(self, value):
        """Validate PAN number format (basic validation)"""
        if value and len(value) != 10:
            raise serializers.ValidationError("PAN number must be exactly 10 characters.")
        return value


class AdminSellerListSerializer(serializers.ModelSerializer):
    """Serializer for admin listing sellers"""

    user_phone = serializers.CharField(source="user.phone", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    rejected_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "user_phone",
            "user_email",
            "user_name",
            "business_name",
            "status",
            "status_display",
            "city",
            "state",
            "kyc_status",
            "created_at",
            "updated_at",
            "rejection_reason",
            "rejected_by_name",
            "rejected_at",
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

    def get_rejected_by_name(self, obj):
        if obj.rejected_by:
            return f"{obj.rejected_by.first_name} {obj.rejected_by.last_name}"
        return None


class AdminSellerDetailSerializer(serializers.ModelSerializer):
    """Serializer for admin viewing seller details"""

    user_phone = serializers.CharField(source="user.phone", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    rejected_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "user_phone",
            "user_email",
            "user_first_name",
            "user_last_name",
            # Store Information
            "store_name",
            "store_description",
            "store_logo",
            "store_banner",
            # Business Information
            "business_name",
            "business_email",
            "business_phone",
            # Address Information
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            # Tax Information
            "gst_number",
            "pan_number",
            # Status Fields
            "kyc_status",
            "status",
            "status_display",
            # Rejection Information
            "rejection_reason",
            "rejected_by_name",
            "rejected_at",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_rejected_by_name(self, obj):
        if obj.rejected_by:
            return f"{obj.rejected_by.first_name} {obj.rejected_by.last_name}"
        return None


class SellerApprovalSerializer(serializers.Serializer):
    """Serializer for approving a seller"""

    message = serializers.CharField(read_only=True)


class SellerRejectionSerializer(serializers.Serializer):
    """Serializer for rejecting a seller"""

    rejection_reason = serializers.CharField(required=True, min_length=10, max_length=500)
    message = serializers.CharField(read_only=True)


class SellerSuspensionSerializer(serializers.Serializer):
    """Serializer for suspending/activating a seller"""

    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)
    message = serializers.CharField(read_only=True)


class SellerBlockSerializer(serializers.Serializer):
    """Serializer for blocking a seller"""

    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)
    message = serializers.CharField(read_only=True)
