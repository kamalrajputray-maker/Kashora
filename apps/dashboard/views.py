from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Sum, Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminOrSuperAdmin, IsSuperAdmin
from apps.accounts.models import User, SellerProfile, BuyerProfile


def _get_date_range(period):
    """Return start date for a given period string."""
    now = timezone.now()
    mapping = {
        '7d': now - timedelta(days=7),
        '30d': now - timedelta(days=30),
        '90d': now - timedelta(days=90),
        '180d': now - timedelta(days=180),
        '1y': now - timedelta(days=365),
    }
    return mapping.get(period, now - timedelta(days=30))


class SuperAdminOverviewView(APIView):
    """
    GET /api/v1/dashboard/super-admin/overview/
    Full platform statistics for SUPER_ADMIN only.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        from apps.catalog.models import Product
        from apps.orders.models import Order, OrderItem

        sellers = SellerProfile.objects.all()
        products = Product.objects.all()
        orders = Order.objects.all()

        total_revenue = orders.filter(
            status='DELIVERED'
        ).aggregate(rev=Sum('final_amount'))['rev'] or Decimal('0')

        data = {
            # Users
            'total_users': User.objects.count(),
            'total_sellers': sellers.count(),
            'approved_sellers': sellers.filter(status='APPROVED').count(),
            'pending_sellers': sellers.filter(status='PENDING').count(),
            'rejected_sellers': sellers.filter(status='REJECTED').count(),
            'suspended_sellers': sellers.filter(status='SUSPENDED').count(),
            'total_buyers': BuyerProfile.objects.count(),
            # Products
            'total_products': products.count(),
            'active_products': products.filter(status='ACTIVE', approval_status='APPROVED').count(),
            'pending_products': products.filter(approval_status='PENDING').count(),
            'inactive_products': products.filter(status='INACTIVE').count(),
            # Orders
            'total_orders': orders.count(),
            'pending_orders': orders.filter(status='PENDING').count(),
            'confirmed_orders': orders.filter(status='CONFIRMED').count(),
            'delivered_orders': orders.filter(status='DELIVERED').count(),
            'cancelled_orders': orders.filter(status='CANCELLED').count(),
            # Revenue
            'total_revenue': str(total_revenue),
        }
        return Response(data)


class AdminOverviewView(APIView):
    """
    GET /api/v1/dashboard/admin/overview/
    Subset stats for ADMIN role (no financials).
    """
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get(self, request):
        from apps.catalog.models import Product
        from apps.orders.models import Order

        sellers = SellerProfile.objects.all()
        products = Product.objects.all()
        orders = Order.objects.all()

        data = {
            'total_sellers': sellers.count(),
            'pending_sellers': sellers.filter(status='PENDING').count(),
            'approved_sellers': sellers.filter(status='APPROVED').count(),
            'total_buyers': BuyerProfile.objects.count(),
            'total_products': products.count(),
            'pending_products': products.filter(approval_status='PENDING').count(),
            'active_products': products.filter(status='ACTIVE', approval_status='APPROVED').count(),
            'total_orders': orders.count(),
            'pending_orders': orders.filter(status='PENDING').count(),
            'delivered_orders': orders.filter(status='DELIVERED').count(),
        }
        return Response(data)


class DashboardChartsView(APIView):
    """
    GET /api/v1/dashboard/charts/?period=30d
    Time-series data for charts.
    """
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get(self, request):
        from apps.orders.models import Order
        period = request.query_params.get('period', '30d')
        start_date = _get_date_range(period)

        # Orders per day
        from django.db.models.functions import TruncDate
        daily_orders = (
            Order.objects
            .filter(placed_at__gte=start_date)
            .annotate(date=TruncDate('placed_at'))
            .values('date')
            .annotate(count=Count('id'), revenue=Sum('final_amount'))
            .order_by('date')
        )

        # New users per day
        daily_users = (
            User.objects
            .filter(created_at__gte=start_date)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        # Seller status breakdown
        seller_status = list(
            SellerProfile.objects.values('status').annotate(count=Count('id'))
        )

        # Product status breakdown
        from apps.catalog.models import Product
        product_status = list(
            Product.objects.values('approval_status').annotate(count=Count('id'))
        )

        return Response({
            'period': period,
            'daily_orders': [
                {
                    'date': str(row['date']),
                    'orders': row['count'],
                    'revenue': str(row['revenue'] or 0),
                }
                for row in daily_orders
            ],
            'daily_users': [
                {'date': str(row['date']), 'users': row['count']}
                for row in daily_users
            ],
            'seller_status': seller_status,
            'product_status': product_status,
        })


class SiteSettingsView(APIView):
    """
    GET /api/v1/dashboard/settings/ (Public)
    PUT /api/v1/dashboard/settings/ (Admin/SuperAdmin)
    """
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsAuthenticated(), IsAdminOrSuperAdmin()]
        return []

    def get(self, request):
        from apps.dashboard.models import SiteSettings
        from apps.dashboard.serializers import SiteSettingsSerializer
        settings = SiteSettings.get_settings()
        return Response(SiteSettingsSerializer(settings, context={'request': request}).data)

    def put(self, request):
        from apps.dashboard.models import SiteSettings
        from apps.dashboard.serializers import SiteSettingsSerializer
        settings = SiteSettings.get_settings()
        serializer = SiteSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
