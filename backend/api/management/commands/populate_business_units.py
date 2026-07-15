from django.core.management.base import BaseCommand
from api.models import Project

class Command(BaseCommand):
    help = 'Populates Business Unit for all existing projects'

    def handle(self, *args, **options):
        # Assuming a default business unit name, modify as necessary
        default_business_unit = "Default BU"

        for project in Project.objects.all():
            if not project.business_unit:
                project.business_unit = default_business_unit
                project.save()
                self.stdout.write(f"Updated Business Unit to '{default_business_unit}' for Project: {project.name}")