from django.contrib import admin

from apps.accounts.models import Address, AdminProfile, BuyerProfile, Permission, Role, SellerProfile, User, UserRole


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["phone", "email", "first_name", "last_name", "is_active", "is_staff", "is_superuser", "is_verified"]
    search_fields = ["phone", "email", "first_name", "last_name"]
    list_filter = ["is_active", "is_staff", "is_superuser", "is_verified"]


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ["name", "description"]
    search_fields = ["name"]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ["name", "description"]
    search_fields = ["name"]


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "is_primary"]
    list_filter = ["is_primary"]


@admin.register(BuyerProfile)
class BuyerProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "gender", "date_of_birth"]
    search_fields = ["user__phone", "user__email"]


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "business_name", "seller_status", "kyc_status"]
    search_fields = ["user__phone", "business_name", "gst_number", "pan_number"]
    list_filter = ["seller_status", "kyc_status"]


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "department"]
    search_fields = ["user__phone", "department"]


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ["user", "name", "city", "state", "country", "is_default"]
    search_fields = ["user__phone", "name", "city", "state"]
