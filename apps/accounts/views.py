from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.constants import RoleType
from apps.accounts.models import AdminProfile, BuyerProfile, SellerProfile, Role, UserRole
from apps.accounts.permissions import IsAdminOrSuperAdmin, IsSuperAdmin
from apps.accounts.serializers import AdminCreateSerializer, BuyerRegistrationSerializer, LoginSerializer, SellerRegistrationSerializer, UserSerializer

User = get_user_model()


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
