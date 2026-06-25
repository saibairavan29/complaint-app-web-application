"""
Management Command: clear_complaints

Safe data cleanup utility for development and testing environments.

Deletes ALL complaint records and their related data:
  - Complaint records
  - Complaint status history
  - Speech processing logs
  - Complaint notifications (complaint-related only)

Preserves all master/configuration data:
  - Users and admin accounts
  - Projects
  - Locations
  - Categories
  - Languages
  - System settings
  - Dashboard configuration
  - System health records
  - Admin activity logs (non-complaint)

Usage:
    python manage.py clear_complaints
    python manage.py clear_complaints --force   (skip confirmation prompt)
    python manage.py clear_complaints --dry-run (show what would be deleted)
"""

from django.core.management.base import BaseCommand
from django.db import transaction, connection


class Command(BaseCommand):
    help = "Safely delete all complaint records while preserving master data (users, projects, locations, categories, settings)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip the confirmation prompt and immediately proceed with deletion.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            dest="dry_run",
            help="Show what would be deleted without actually deleting anything.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        dry_run = options["dry_run"]

        self.stdout.write(self.style.WARNING("=" * 60))
        self.stdout.write(self.style.WARNING("  COMPLAINT RECORDS CLEANUP UTILITY"))
        self.stdout.write(self.style.WARNING("=" * 60))

        # Import models here to avoid app registry issues
        try:
            from api.models import (
                Complaint,
                ComplaintStatusHistory,
                SpeechProcessingLog,
                Notification,
            )
        except ImportError as e:
            self.stderr.write(self.style.ERROR(f"Failed to import models: {e}"))
            return

        # Count records that will be affected
        complaint_count = Complaint.objects.count()
        history_count = ComplaintStatusHistory.objects.count() if hasattr(ComplaintStatusHistory, 'objects') else 0

        try:
            speech_log_count = SpeechProcessingLog.objects.count()
        except Exception:
            speech_log_count = 0

        try:
            notif_count = Notification.objects.filter(
                notification_type="complaint_created"
            ).count() + Notification.objects.filter(
                notification_type="complaint_updated"
            ).count()
        except Exception:
            notif_count = 0

        self.stdout.write("")
        self.stdout.write("Records to be DELETED:")
        self.stdout.write(f"  • Complaints:              {complaint_count:,}")
        self.stdout.write(f"  • Status history entries:  {history_count:,}")
        self.stdout.write(f"  • Speech processing logs:  {speech_log_count:,}")
        self.stdout.write(f"  • Complaint notifications: {notif_count:,}")
        self.stdout.write("")
        self.stdout.write("Records PRESERVED (not touched):")
        self.stdout.write("  ✓ Users and admin accounts")
        self.stdout.write("  ✓ Projects & Business Units")
        self.stdout.write("  ✓ Locations")
        self.stdout.write("  ✓ Categories")
        self.stdout.write("  ✓ Languages")
        self.stdout.write("  ✓ System settings and configuration")
        self.stdout.write("  ✓ Dashboard configuration")
        self.stdout.write("  ✓ Admin activity logs")
        self.stdout.write("")

        if dry_run:
            self.stdout.write(self.style.SUCCESS("[DRY RUN] No records were deleted. Remove --dry-run to execute."))
            return

        if complaint_count == 0:
            self.stdout.write(self.style.SUCCESS("No complaint records found. Nothing to delete."))
            return

        if not force:
            self.stdout.write(self.style.WARNING(
                f"WARNING: This will permanently delete {complaint_count:,} complaint(s) and all related data."
            ))
            self.stdout.write(self.style.WARNING("This action CANNOT be undone."))
            self.stdout.write("")
            confirm = input("Type 'YES' to confirm deletion: ").strip()
            if confirm != "YES":
                self.stdout.write(self.style.ERROR("Aborted. No records were deleted."))
                return

        self.stdout.write("")
        self.stdout.write("Deleting complaint records...")

        try:
            with transaction.atomic():
                # Delete speech processing logs first (FK constraint)
                try:
                    deleted_speech, _ = SpeechProcessingLog.objects.all().delete()
                    self.stdout.write(f"  ✓ Deleted {deleted_speech:,} speech processing log(s)")
                except Exception as e:
                    self.stdout.write(f"  ⚠ Speech logs: {e}")

                # Delete complaint status history
                try:
                    deleted_history, _ = ComplaintStatusHistory.objects.all().delete()
                    self.stdout.write(f"  ✓ Deleted {deleted_history:,} status history record(s)")
                except Exception as e:
                    self.stdout.write(f"  ⚠ Status history: {e}")

                # Delete complaint-related notifications
                try:
                    deleted_notifs, _ = Notification.objects.filter(
                        notification_type__in=["complaint_created", "complaint_updated"]
                    ).delete()
                    self.stdout.write(f"  ✓ Deleted {deleted_notifs:,} complaint notification(s)")
                except Exception as e:
                    self.stdout.write(f"  ⚠ Notifications: {e}")

                # Delete all complaints (cascade will handle remaining FKs)
                deleted_complaints, breakdown = Complaint.objects.all().delete()
                self.stdout.write(f"  ✓ Deleted {deleted_complaints:,} complaint record(s)")

                self.stdout.write("")
                self.stdout.write(self.style.SUCCESS("=" * 60))
                self.stdout.write(self.style.SUCCESS("  CLEANUP COMPLETE"))
                self.stdout.write(self.style.SUCCESS(f"  Total records removed: {deleted_complaints + deleted_history + deleted_speech + deleted_notifs:,}"))
                self.stdout.write(self.style.SUCCESS("  Master data preserved: Users, Projects, Locations, Categories"))
                self.stdout.write(self.style.SUCCESS("=" * 60))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error during deletion: {e}"))
            self.stderr.write(self.style.ERROR("Transaction rolled back. No data was deleted."))
            raise
