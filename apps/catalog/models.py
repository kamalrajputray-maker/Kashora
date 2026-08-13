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
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    parent = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="children")
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categories"
        verbose_name_plural = "Categories"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name
        
    def clean(self):
        super().clean()
        if self.parent:
            if self.parent == self:
                raise ValidationError({"parent": "A category cannot be its own parent."})
            
            # Check for circular hierarchy
            current_parent = self.parent
            while current_parent is not None:
                if current_parent == self:
                    raise ValidationError({"parent": "Circular category hierarchy is not allowed."})
                current_parent = current_parent.parent

    def save(self, *args, **kwargs):
        self.clean()
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


# ──────────────────────────────────────────────
# PRODUCT ATTRIBUTE & VARIANT MODELS
# ──────────────────────────────────────────────

class ProductAttribute(models.Model):
    """
    A named attribute that belongs to a product.
    Example: Product "Women's Kurti" may have attributes "Color" and "Size".
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="attributes")
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "product_attributes"
        unique_together = [("product", "name")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.product.name} — {self.name}"


class ProductAttributeValue(models.Model):
    """
    A specific value for a product attribute.
    Example: Attribute "Color" → Values: "Red", "Blue", "Green"
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attribute = models.ForeignKey(ProductAttribute, on_delete=models.CASCADE, related_name="values")
    value = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "product_attribute_values"
        unique_together = [("attribute", "value")]
        ordering = ["value"]

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"


class ProductVariant(models.Model):
    """
    A specific SKU-level variant of a product.
    Example: Women's Kurti — Red / M → SKU: KUR-RED-M-001
    Each variant is tied to a unique combination of ProductAttributeValues.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    weight = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                 help_text="Weight in grams")
    is_active = models.BooleanField(default=True)
    attribute_values = models.ManyToManyField(
        ProductAttributeValue,
        related_name="variants",
        blank=True,
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "product_variants"
        ordering = ["created_at"]

    def __str__(self):
        combo = ", ".join(str(v) for v in self.attribute_values.all())
        return f"{self.product.name} [{combo}] — {self.sku}"

    def clean(self):
        super().clean()
        if self.compare_at_price is not None and self.price is not None:
            if self.compare_at_price < self.price:
                raise ValidationError({
                    "compare_at_price": "Variant compare-at price must be ≥ variant price."
                })

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def validate_unique_combination(self, attr_value_ids):
        """
        Ensure no other variant on the same product has the exact same set of
        attribute value IDs. Call this AFTER setting attribute_values (M2M).
        """
        from django.db.models import Count
        av_ids_set = set(attr_value_ids)
        n = len(av_ids_set)

        # Find variants on this product with same number of matching values
        candidates = ProductVariant.objects.filter(
            product=self.product,
            attribute_values__id__in=av_ids_set,
        ).exclude(pk=self.pk).annotate(match_count=Count("attribute_values")).filter(
            match_count=n
        )

        for candidate in candidates:
            candidate_ids = set(
                candidate.attribute_values.values_list("id", flat=True)
            )
            if candidate_ids == av_ids_set:
                raise ValidationError(
                    "A variant with this exact combination of attributes already exists "
                    f"for this product (SKU: {candidate.sku})."
                )

