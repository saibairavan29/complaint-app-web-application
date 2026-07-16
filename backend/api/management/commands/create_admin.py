from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = "Create or reset default admin"

    def handle(self, *args, **options):
        username = "saib29"
        password = "adminsai"
        email = "saib@gmail.com"

        User.objects.filter(username=username).delete()

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
        )

        self.stdout.write(self.style.SUCCESS("Admin user created successfully."))