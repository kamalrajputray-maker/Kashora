from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.catalog.models import Category


CATEGORIES = [
    ("Electronics", "Phones, laptops, accessories, and more"),
    ("Clothing", "Men, women, and kids fashion"),
    ("Home & Kitchen", "Furniture, appliances, and kitchenware"),
    ("Beauty & Personal Care", "Skincare, haircare, and grooming"),
    ("Sports & Fitness", "Equipment, activewear, and accessories"),
    ("Toys & Games", "Board games, outdoor toys, and kids' gifts"),
    ("Books", "Fiction, non-fiction, educational, and more"),
    ("Grocery & Food", "Snacks, beverages, staples, and organic"),
    ("Automotive", "Car accessories, tools, and maintenance"),
    ("Jewellery & Accessories", "Earrings, necklaces, bags, and wallets"),
]


class Command(BaseCommand):
    help = "Seed default product categories"

    def handle(self, *args, **options):
        created = 0
        skipped = 0
        for name, description in CATEGORIES:
            slug = slugify(name)
            _, was_created = Category.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "description": description},
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  Created: {name}"))
            else:
                skipped += 1
                self.stdout.write(f"  Exists:  {name}")
        self.stdout.write(
            self.style.SUCCESS(f"\nDone: {created} created, {skipped} already existed.")
        )
