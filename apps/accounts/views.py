import random
import uuid
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.constants import RoleType
from apps.accounts.models import AdminProfile, BuyerProfile, SellerProfile, Role, UserRole
from apps.accounts.permissions import IsAdminOrSuperAdmin, IsSuperAdmin
from apps.accounts.serializers import AdminCreateSerializer, BuyerRegistrationSerializer, LoginSerializer, SellerRegistrationSerializer, UserSerializer, VerificationDocumentSerializer

User = get_user_model()


class SendOTPAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store OTP in cache for 5 minutes (300 seconds)
        cache.set(f"otp_{email}", otp, timeout=300)
        
        # Send Email
        try:
            send_mail(
                subject="Your Kashora Verification Code",
                message=f"Your verification code is: {otp}\nThis code will expire in 5 minutes.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            return Response({"detail": "Failed to send email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({"message": "OTP sent successfully."}, status=status.HTTP_200_OK)


class VerifyOTPAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        otp = request.data.get("otp")
        
        if not email or not otp:
            return Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        cached_otp = cache.get(f"otp_{email}")
        
        if not cached_otp or cached_otp != str(otp):
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Clear the OTP from cache
        cache.delete(f"otp_{email}")
        
        # Generate a temporary validation token (valid for registration/reset)
        token = str(uuid.uuid4())
        cache.set(f"valid_token_{email}", token, timeout=600) # 10 mins
        
        return Response({"message": "OTP verified successfully.", "token": token}, status=status.HTTP_200_OK)


class ResetPasswordAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        otp_token = request.data.get("otp_token")
        new_password = request.data.get("new_password")
        
        if not email or not otp_token or not new_password:
            return Response({"detail": "email, otp_token, and new_password are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        cached_token = cache.get(f"valid_token_{email}")
        if not cached_token or cached_token != otp_token:
            return Response({"detail": "Invalid or expired OTP token."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
        user.set_password(new_password)
        user.save()
        
        # Clear token
        cache.delete(f"valid_token_{email}")
        
        return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)


class BuyerRegistrationAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = BuyerRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response = UserSerializer(user)
        return Response({"message": "Buyer registered successfully.", "user": response.data}, status=status.HTTP_201_CREATED)


class SellerRegistrationAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SellerRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response = UserSerializer(user)
        return Response({"message": "Seller registered successfully.", "user": response.data}, status=status.HTTP_201_CREATED)


class LoginAPIView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        
        from apps.dashboard.models import SiteSettings
        from django.core.cache import cache
        import uuid
        
        settings = SiteSettings.get_settings()
        if settings.enable_2fa and user.email:
            # Generate OTP
            token = str(uuid.uuid4())
            cache.set(f"valid_token_{user.email}", token, timeout=600)
            
            try:
                from django.core.mail import send_mail
                from django.conf import settings as django_settings
                send_mail(
                    subject="Kashora Login Verification",
                    message=f"Your login verification OTP is: {token}",
                    from_email=django_settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                pass
                
            return Response(
                {"requires_otp": True, "message": "OTP sent to your email", "email": user.email},
                status=status.HTTP_200_OK
            )
        
        refresh = serializer.validated_data["refresh"]
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "phone": user.phone,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


class LoginVerifyOTPAPIView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        otp_token = request.data.get("otp_token")
        
        if not email or not otp_token:
            return Response({"detail": "Email and OTP token are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.core.cache import cache
        cached_token = cache.get(f"valid_token_{email}")
        
        if not cached_token or cached_token != otp_token:
            return Response({"detail": "Invalid or expired OTP token."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if not user.is_active:
            return Response({"detail": "This account is inactive."}, status=status.HTTP_400_BAD_REQUEST)
            
        cache.delete(f"valid_token_{email}")
        
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "phone": user.phone,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserAPIView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class AdminCreateAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminCreateSerializer
    permission_classes = [IsSuperAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class ProtectedAdminAPIView(generics.GenericAPIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        return Response({"message": "Super admin access granted."}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# ADMIN MANAGEMENT — SUPER ADMIN ONLY
# ─────────────────────────────────────────────

class AdminListView(generics.ListCreateAPIView):
    """
     GET /api/v1/admins/ — List all admins (Super Admin only)
     POST /api/v1/admins/ — Create admin (Super Admin only)
     """
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            from apps.accounts.admin_serializers import AdminCreateSerializer
            return AdminCreateSerializer
        from apps.accounts.admin_serializers import AdminListSerializer
        return AdminListSerializer

    def get_queryset(self):
        from apps.accounts.constants import RoleType
        return User.objects.filter(
            user_roles__role__name=RoleType.ADMIN.value,
            user_roles__is_primary=True
        ).select_related('admin_profile').order_by('-created_at')


class AdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/v1/admins/{id}/ — Admin detail (Super Admin only)
    """
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        from apps.accounts.admin_serializers import AdminDetailSerializer
        return AdminDetailSerializer

    def get_queryset(self):
        from apps.accounts.constants import RoleType
        return User.objects.filter(
            user_roles__role__name=RoleType.ADMIN.value,
            user_roles__is_primary=True
        ).select_related('admin_profile')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Prevent deleting self
        if instance == request.user:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)
        instance.delete()
        return Response({"detail": "Admin deleted successfully."}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# BUYER MANAGEMENT — ADMIN+
# ─────────────────────────────────────────────

class BuyerListView(generics.ListAPIView):
    """
    GET /api/v1/admin/buyers/ — List all buyers (Admin+)
    """
    permission_classes = [IsAdminOrSuperAdmin]

    def get_serializer_class(self):
        from apps.accounts.admin_serializers import BuyerListSerializer
        return BuyerListSerializer

    def get_queryset(self):
        from apps.accounts.constants import RoleType
        from rest_framework.filters import SearchFilter
        qs = User.objects.filter(
            user_roles__role__name=RoleType.BUYER.value,
            user_roles__is_primary=True
        ).prefetch_related('orders').order_by('-created_at')
        search = self.request.query_params.get('search', '')
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(phone__icontains=search) | Q(email__icontains=search) |
                           Q(first_name__icontains=search) | Q(last_name__icontains=search))
        status_filter = self.request.query_params.get('is_active', '')
        if status_filter in ['true', 'false']:
            qs = qs.filter(is_active=(status_filter == 'true'))
        return qs


class BuyerDetailView(generics.RetrieveUpdateAPIView):
    """
    GET /api/v1/admin/buyers/{id}/ — Buyer detail
    PATCH /api/v1/admin/buyers/{id}/toggle-status/ — Activate/Deactivate
    """
    permission_classes = [IsAdminOrSuperAdmin]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_serializer_class(self):
        from apps.accounts.admin_serializers import BuyerDetailSerializer
        return BuyerDetailSerializer

    def get_queryset(self):
        from apps.accounts.constants import RoleType
        return User.objects.filter(
            user_roles__role__name=RoleType.BUYER.value,
            user_roles__is_primary=True
        ).prefetch_related('orders', 'addresses')

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = not instance.is_active
        instance.save(update_fields=['is_active'])
        action = 'activated' if instance.is_active else 'deactivated'
        return Response({"detail": f"Buyer {action} successfully.", "is_active": instance.is_active})

# -----------------------------------------------------------------
# Verification Document API
# -----------------------------------------------------------------
from rest_framework import viewsets, permissions
from apps.accounts.models import VerificationDocument
from apps.accounts.serializers import VerificationDocumentSerializer

class IsSellerOrAdmin(permissions.BasePermission):
    """Allow sellers to create their own documents and admins to view/modify any."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'role', None) == "SELLER":
            return obj.seller.user == request.user
        return request.user.role in ["ADMIN", "SUPERADMIN"]

class VerificationDocumentViewSet(viewsets.ModelViewSet):
    queryset = VerificationDocument.objects.all().select_related('seller')
    serializer_class = VerificationDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSellerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == "SELLER":
            return VerificationDocument.objects.filter(seller__user=user)
        return super().get_queryset()

    def perform_create(self, serializer):
        seller_profile = getattr(self.request.user, 'seller_profile', None)
        serializer.save(seller=seller_profile)

