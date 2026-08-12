from django.contrib import admin
from apps.catalog.models import Category, Product

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "seller", "category", "base_price", "status", "approval_status", "created_at")
    list_filter = ("status", "approval_status", "category", "created_at")
    search_fields = ("name", "slug", "brand", "seller__business_name")
    prepopulated_fields = {"slug": ("name",)}
    raw_id_fields = ("seller",)
