from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    AdminCreateAPIView,
    AdminListView,
    AdminDetailView,
    BuyerListView,
    BuyerDetailView,
    BuyerRegistrationAPIView,
    CurrentUserAPIView,
    LoginAPIView,
    LogoutAPIView,
    SellerRegistrationAPIView,
    VerificationDocumentViewSet,
)

urlpatterns = [
    path("auth/register/buyer/", BuyerRegistrationAPIView.as_view(), name="buyer_register"),
    path("auth/register/seller/", SellerRegistrationAPIView.as_view(), name="seller_register"),
    path("auth/login/", LoginAPIView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth_logout"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", CurrentUserAPIView.as_view(), name="auth_me"),
    # Admin management (Super Admin only)
    path("admins/", AdminListView.as_view(), name="admin_list_create"),
    path("admins/<uuid:pk>/", AdminDetailView.as_view(), name="admin_detail"),
    # Buyer management (Admin+)
    path("admin/buyers/", BuyerListView.as_view(), name="buyer_list"),
    path("admin/buyers/<uuid:pk>/", BuyerDetailView.as_view(), name="buyer_detail"),
    # Verification Document endpoints
    path("verification-documents/", VerificationDocumentViewSet.as_view({"get": "list", "post": "create"}), name="verification_document_list"),
    path("verification-documents/<uuid:pk>/", VerificationDocumentViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="verification_document_detail"),
]

