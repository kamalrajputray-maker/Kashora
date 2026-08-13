from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.catalog.models import ProductVariant
from apps.inventory.models import Inventory

@receiver(post_save, sender=ProductVariant)
def create_variant_inventory(sender, instance, created, **kwargs):
    if created:
        Inventory.objects.get_or_create(variant=instance)
