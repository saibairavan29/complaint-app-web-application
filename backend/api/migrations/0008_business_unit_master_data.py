from django.db import migrations, models


DEFAULT_CATEGORIES = [
    ("water", "Water", 1),
    ("electricity", "Electricity", 2),
    ("toilet", "Toilet", 3),
    ("room", "Room / Accommodation", 4),
    ("safety", "Safety", 5),
    ("health", "Health", 6),
    ("food", "Food", 7),
    ("other", "Other", 8),
]

DEFAULT_LANGUAGES = [
    ("en", "English", 1),
    ("hi", "Hindi", 2),
    ("ta", "Tamil", 3),
    ("te", "Telugu", 4),
    ("mr", "Marathi", 5),
    ("or", "Odia", 6),
    ("bn", "Bengali", 7),
    ("pa", "Punjabi", 8),
    ("gu", "Gujarati", 9),
    ("as", "Assamese", 10),
    ("kn", "Kannada", 11),
    ("ml", "Malayalam", 12),
]


def seed_master_data(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    Language = apps.get_model("api", "Language")
    Complaint = apps.get_model("api", "Complaint")
    Project = apps.get_model("api", "Project")

    for slug, label, order in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            slug=slug,
            defaults={"label": label, "sort_order": order, "is_active": True},
        )

    for code, name, order in DEFAULT_LANGUAGES:
        Language.objects.get_or_create(
            code=code,
            defaults={"name": name, "sort_order": order, "is_active": True},
        )

    for complaint in Complaint.objects.select_related("project").iterator():
        if complaint.project_id and not complaint.business_unit:
            complaint.business_unit = complaint.project.business_unit or ""
            complaint.save(update_fields=["business_unit"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_loginlockout_ip_address_loginlockout_last_attempt_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="business_unit",
            field=models.CharField(blank=True, default="", help_text="Business unit assigned to this project", max_length=255),
        ),
        migrations.AddField(
            model_name="complaint",
            name="business_unit",
            field=models.CharField(blank=True, db_index=True, default="", help_text="Business unit snapshot at submission time", max_length=255),
        ),
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.CharField(help_text="Unique category key (e.g. water, electricity)", max_length=50, unique=True)),
                ("label", models.CharField(help_text="English display label for admin", max_length=100)),
                ("localized_labels", models.JSONField(blank=True, default=dict, help_text="Worker-facing bilingual labels")),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name_plural": "categories",
                "ordering": ["sort_order", "label"],
            },
        ),
        migrations.CreateModel(
            name="Language",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(help_text="Language code (e.g. en, hi, ta)", max_length=10, unique=True)),
                ("name", models.CharField(help_text="English display name for admin", max_length=100)),
                ("localized_names", models.JSONField(blank=True, default=dict, help_text="Worker-facing bilingual names")),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.RunPython(seed_master_data, migrations.RunPython.noop),
    ]
