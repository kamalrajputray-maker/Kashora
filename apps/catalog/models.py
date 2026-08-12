import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from apps.accounts.models import SellerProfile

class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categories"
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
        ("ARCHIVED", "Archived"),
    ]

    APPROVAL_STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(SellerProfile, on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    brand = models.CharField(max_length=100)
    
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2)
    
    returnable = models.BooleanField(default=True)
    return_window_days = models.IntegerField(default=7)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT", db_index=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default="PENDING", db_index=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        
        # Enforce compare_at_price >= base_price
        if self.compare_at_price is not None and self.compare_at_price < self.base_price:
            raise ValidationError({
                "compare_at_price": "Compare-at price must be greater than or equal to the base price."
            })
            
        # Validate return window days if returnable is True
        if self.returnable and (self.return_window_days is None or self.return_window_days < 0):
            raise ValidationError({
                "return_window_days": "Return window must be 0 or more days if the product is returnable."
            })

    def save(self, *args, **kwargs):
        self.clean()
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
