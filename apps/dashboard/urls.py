from django.urls import path
from apps.dashboard.views import (
    SuperAdminOverviewView,
    AdminOverviewView,
    DashboardChartsView,
)

urlpatterns = [
    path('dashboard/super-admin/overview/', SuperAdminOverviewView.as_view(), name='super-admin-overview'),
    path('dashboard/admin/overview/', AdminOverviewView.as_view(), name='admin-overview'),
    path('dashboard/charts/', DashboardChartsView.as_view(), name='dashboard-charts'),
]
