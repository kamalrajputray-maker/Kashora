"""
Additional serializers for Admin Management (Super Admin only) 
and Buyer Management (Admin+) APIs.
"""
from django.contrib.auth import get_user_model
from rest_framework import serializers
from apps.accounts.models import Role, AdminProfile, BuyerProfile, UserRole

User = get_user_model()


class AdminListSerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'phone', 'email', 'first_name', 'last_name',
                  'role', 'department', 'is_active', 'is_staff', 'created_at']
        read_only_fields = fields

    def get_department(self, obj):
        try:
            return obj.admin_profile.department
        except AdminProfile.DoesNotExist:
            return None

    def get_role(self, obj):
        return obj.role


class AdminDetailSerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'phone', 'email', 'first_name', 'last_name',
                  'role', 'department', 'is_active', 'is_staff', 'created_at', 'updated_at']
        read_only_fields = ['id', 'role', 'created_at', 'updated_at']

    def get_department(self, obj):
        try:
            return obj.admin_profile.department
        except AdminProfile.DoesNotExist:
            return None

    def get_role(self, obj):
        return obj.role

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()
        return instance


class BuyerListSerializer(serializers.ModelSerializer):
    order_count = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'phone', 'email', 'first_name', 'last_name',
                  'role', 'is_active', 'order_count', 'total_spent', 'created_at']
        read_only_fields = fields

    def get_order_count(self, obj):
        return obj.orders.count()

    def get_total_spent(self, obj):
        from django.db.models import Sum
        result = obj.orders.filter(status='DELIVERED').aggregate(total=Sum('final_amount'))
        return str(result['total'] or 0)

    def get_role(self, obj):
        return obj.role


class BuyerDetailSerializer(BuyerListSerializer):
    addresses = serializers.SerializerMethodField()

    class Meta(BuyerListSerializer.Meta):
        fields = BuyerListSerializer.Meta.fields + ['addresses', 'updated_at']
        read_only_fields = fields

    def get_addresses(self, obj):
        return list(obj.addresses.values('id', 'name', 'city', 'state', 'is_default'))

class AdminCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    department = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'phone', 'email', 'first_name', 'last_name', 'password', 'department']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        department = validated_data.pop('department', None)
        # Create user with ADMIN role
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.role = Role.objects.get(name='ADMIN')
        user.save()
        # Assign primary role
        from apps.accounts.models import UserRole
        from apps.accounts.constants import RoleType
        admin_role = Role.objects.get(name=RoleType.ADMIN.value)
        UserRole.objects.create(user=user, role=admin_role, is_primary=True)
        # Create admin profile
        AdminProfile.objects.create(user=user, department=department)
        return user
