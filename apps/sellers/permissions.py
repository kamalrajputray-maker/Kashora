from rest_framework.permissions import BasePermission

from apps.accounts.constants import RoleType


class IsSeller(BasePermission):
    """Check if user is a seller"""

    message = "Only sellers can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == RoleType.SELLER.value
        )


class IsSellerOwner(BasePermission):
    """Check if seller owns the profile being accessed"""

    message = "You can only access your own seller profile."

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsAdminOrSuperAdmin(BasePermission):
    """Check if user is admin or super admin"""

    message = "Only admins or super admins can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {RoleType.ADMIN.value, RoleType.SUPER_ADMIN.value}
        )


class CanApproveSeller(BasePermission):
    """Check if user can approve sellers"""

    message = "Only admins or super admins can approve sellers."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {RoleType.ADMIN.value, RoleType.SUPER_ADMIN.value}
        )
