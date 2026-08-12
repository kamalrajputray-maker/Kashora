from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    AdminCreateAPIView,
    BuyerRegistrationAPIView,
    CurrentUserAPIView,
    LoginAPIView,
    LogoutAPIView,
    SellerRegistrationAPIView,
)

urlpatterns = [
    path("auth/register/buyer/", BuyerRegistrationAPIView.as_view(), name="buyer_register"),
    path("auth/register/seller/", SellerRegistrationAPIView.as_view(), name="seller_register"),
    path("auth/login/", LoginAPIView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth_logout"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", CurrentUserAPIView.as_view(), name="auth_me"),
    path("admins/", AdminCreateAPIView.as_view(), name="admin_list_create"),
]
