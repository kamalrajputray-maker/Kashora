from django.core.management.base import BaseCommand

from apps.accounts.constants import RoleType
from apps.accounts.models import Role


class Command(BaseCommand):
    help = "Create the default platform roles if they do not already exist."

    def handle(self, *args, **options):
        roles = [
            (RoleType.SUPER_ADMIN.value, "System owner with full access."),
            (RoleType.ADMIN.value, "Operational admin with restricted control."),
            (RoleType.SELLER.value, "Vendor account awaiting approval."),
            (RoleType.BUYER.value, "Browse and buy on the platform."),
        ]

        created = []
        for name, description in roles:
            role, is_created = Role.objects.get_or_create(name=name, defaults={"description": description})
            if is_created:
                created.append(name)

        self.stdout.write(self.style.SUCCESS(f"Roles ensured. Created: {', '.join(created) if created else 'none'}"))
