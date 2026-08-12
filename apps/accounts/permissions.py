from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    message = "Only super admins can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "SUPER_ADMIN")


class IsAdmin(BasePermission):
    message = "Only admins can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "ADMIN")


class IsSeller(BasePermission):
    message = "Only sellers can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "SELLER")


class IsBuyer(BasePermission):
    message = "Only buyers can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "BUYER")


class IsAdminOrSuperAdmin(BasePermission):
    message = "Only admins or super admins can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"ADMIN", "SUPER_ADMIN"}
        )


class IsSellerOrAdmin(BasePermission):
    message = "Only sellers or admins can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"SELLER", "ADMIN", "SUPER_ADMIN"}
        )
