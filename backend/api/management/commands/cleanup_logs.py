import os
import json
import zipfile
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from api.models import UserActivity, SecurityEvent, QueueFailureLog, SystemErrorLog

class Command(BaseCommand):
    help = 'Cleans up and archives standard database logs older than 180 days.'

    def handle(self, *args, **options):
        now = timezone.now()
        retention_cutoff = now - timedelta(days=180)
        self.stdout.write(f"Starting log retention cleanup. Cutoff date: {retention_cutoff.isoformat()}")

        # Fetch records to delete
        # Standard logs to clean up (older than 180 days):
        # UserActivity: all older than 180 days
        # QueueFailureLog: all older than 180 days
        # SystemErrorLog: all older than 180 days
        # SecurityEvent: only non-critical ones (critical = account_lockout, suspicious_activity - keep forever)
        
        user_activities = UserActivity.objects.filter(login_time__lt=retention_cutoff)
        queue_failures = QueueFailureLog.objects.filter(failed_at__lt=retention_cutoff)
        system_errors = SystemErrorLog.objects.filter(created_at__lt=retention_cutoff)
        
        # Security events: failed_login and rate_limit_exceeded are standard (180 days), others are critical
        standard_security_types = ['failed_login', 'rate_limit_exceeded']
        security_events = SecurityEvent.objects.filter(
            created_at__lt=retention_cutoff,
            event_type__in=standard_security_types
        )

        # Count of records to be deleted
        ua_count = user_activities.count()
        qf_count = queue_failures.count()
        se_count = security_events.count()
        sy_count = system_errors.count()
        total_records = ua_count + qf_count + se_count + sy_count

        if total_records == 0:
            self.stdout.write("No logs older than 180 days found. Cleanup complete.")
            return

        self.stdout.write(f"Found {total_records} records to cleanup and archive:")
        self.stdout.write(f"  - UserActivity: {ua_count}")
        self.stdout.write(f"  - QueueFailureLog: {qf_count}")
        self.stdout.write(f"  - SecurityEvent (Standard): {se_count}")
        self.stdout.write(f"  - SystemErrorLog: {sy_count}")

        # Serialize records to JSON for archiving
        archive_data = {
            "archive_timestamp": now.isoformat(),
            "cutoff_date": retention_cutoff.isoformat(),
            "UserActivity": [
                {
                    "username": ua.username,
                    "login_time": ua.login_time.isoformat() if ua.login_time else None,
                    "logout_time": ua.logout_time.isoformat() if ua.logout_time else None,
                    "session_duration": ua.session_duration,
                    "ip_address": ua.ip_address,
                    "browser": ua.browser,
                    "device_type": ua.device_type,
                    "activity_type": ua.activity_type
                } for ua in user_activities
            ],
            "QueueFailureLog": [
                {
                    "complaint_ref": qf.complaint.reference_number if qf.complaint else "None",
                    "exception_message": qf.exception_message,
                    "traceback_summary": qf.traceback_summary,
                    "attempt_count": qf.attempt_count,
                    "failed_at": qf.failed_at.isoformat()
                } for qf in queue_failures
            ],
            "SecurityEvent": [
                {
                    "event_type": se.event_type,
                    "username": se.username,
                    "ip_address": se.ip_address,
                    "details": se.details,
                    "created_at": se.created_at.isoformat()
                } for se in security_events
            ],
            "SystemErrorLog": [
                {
                    "error_type": sy.error_type,
                    "message": sy.message,
                    "traceback_summary": sy.traceback_summary,
                    "created_at": sy.created_at.isoformat()
                } for sy in system_errors
            ]
        }

        # Create zip archive
        archive_dir = os.path.join(settings.BASE_DIR, 'backups', 'logs')
        os.makedirs(archive_dir, exist_ok=True)
        timestamp = now.strftime('%Y%m%d_%H%M%S')
        archive_filename = f"archived_logs_{timestamp}.zip"
        archive_path = os.path.join(archive_dir, archive_filename)

        try:
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.writestr('archived_logs.json', json.dumps(archive_data, indent=2))
            self.stdout.write(self.style.SUCCESS(f"Logs archived successfully to {archive_path}"))
            
            # Perform Deletions from DB
            deleted_ua, _ = user_activities.delete()
            deleted_qf, _ = queue_failures.delete()
            deleted_se, _ = security_events.delete()
            deleted_sy, _ = system_errors.delete()
            
            self.stdout.write(self.style.SUCCESS(
                f"Successfully deleted archived records from the database:\n"
                f"  - UserActivity: {deleted_ua}\n"
                f"  - QueueFailureLog: {deleted_qf}\n"
                f"  - SecurityEvent: {deleted_se}\n"
                f"  - SystemErrorLog: {deleted_sy}"
            ))
        except Exception as archive_err:
            self.stdout.write(self.style.ERROR(f"Failed to archive logs: {archive_err}. Deletions aborted."))
