from django.db import models
from django.contrib.auth import get_user_model

class Project(models.Model):
    name = models.CharField(max_length=255, unique=True, help_text="Master project name")
    business_unit = models.CharField(max_length=255, blank=True, default="", help_text="Business unit assigned to this project")
    localized_names = models.JSONField(default=dict, blank=True, help_text="Language translations for project name")
    is_active = models.BooleanField(default=True, help_text="Whether this project is active and available to workers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Location(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='locations', help_text="Associated project")
    name = models.CharField(max_length=255, help_text="Camp or accommodation block name")
    localized_names = models.JSONField(default=dict, blank=True, help_text="Language translations for location name")
    is_active = models.BooleanField(default=True, help_text="Whether this location is active and select-able")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ('project', 'name')

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class Category(models.Model):
    slug = models.CharField(max_length=50, unique=True, help_text="Unique category key (e.g. water, electricity)")
    label = models.CharField(max_length=100, help_text="English display label for admin")
    localized_labels = models.JSONField(default=dict, blank=True, help_text="Worker-facing bilingual labels")
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'label']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.label


class Language(models.Model):
    code = models.CharField(max_length=10, unique=True, help_text="Language code (e.g. en, hi, ta)")
    name = models.CharField(max_length=100, help_text="English display name for admin")
    localized_names = models.JSONField(default=dict, blank=True, help_text="Worker-facing bilingual names")
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Complaint(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Resolved', 'Resolved'),
        ('Rejected', 'Rejected'),
    ]

    project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name='complaints', help_text="Project where issue occurred")
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='complaints', help_text="Specific camp area or block")
    business_unit = models.CharField(max_length=255, blank=True, default="", db_index=True, help_text="Business unit snapshot at submission time")
    category = models.CharField(max_length=50, db_index=True, help_text="Issue category (e.g. water, electricity, toilet)")
    language = models.CharField(max_length=10, help_text="Worker language code (e.g. en, hi, ta)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True, help_text="Current complaint status")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    # Future integration fields (nullable)
    photo_url = models.URLField(max_length=500, blank=True, null=True, help_text="Cloudinary or AWS S3 image storage URL")
    audio_url = models.URLField(max_length=500, blank=True, null=True, help_text="Cloudinary or AWS S3 audio recording URL")
    original_text = models.TextField(blank=True, null=True, help_text="Speech-to-text transcript in original language")
    english_translation = models.TextField(blank=True, null=True, help_text="English translation of transcript/comments")
    reference_number = models.CharField(max_length=50, unique=True, help_text="Tracking ticket format: CMP-YYYY-XXXXX")

    # Phase 5.5 Speech STT fields
    transcript = models.TextField(blank=True, null=True, help_text="Speech transcript")
    detected_language = models.CharField(max_length=50, blank=True, null=True)
    transcript_confidence = models.FloatField(blank=True, null=True)
    has_audio = models.BooleanField(default=False)
    
    transcription_status = models.CharField(
        max_length=20, 
        default='PENDING', 
        choices=[
            ('PENDING', 'Pending'),
            ('PROCESSING', 'Processing'),
            ('RETRYING', 'Retrying'),
            ('COMPLETED', 'Completed'),
            ('FAILED', 'Failed')
        ],
        db_index=True
    )
    translation_status = models.CharField(
        max_length=20, 
        default='PENDING', 
        choices=[
            ('PENDING', 'Pending'),
            ('COMPLETED', 'Completed'),
            ('FAILED', 'Failed')
        ],
        db_index=True
    )
    audio_duration_seconds = models.FloatField(blank=True, null=True)
    submission_type = models.CharField(
        max_length=20, 
        default='TEXT', 
        choices=[
            ('TEXT', 'Text Only'),
            ('VOICE', 'Voice Only'),
            ('TEXT_AND_VOICE', 'Text and Voice')
        ]
    )
    last_transcription_attempt = models.DateTimeField(blank=True, null=True)
    original_audio_url = models.URLField(max_length=500, blank=True, null=True)
    normalized_audio_url = models.URLField(max_length=500, blank=True, null=True)
    transcription_error = models.TextField(blank=True, null=True)

    # Phase 5.6 translation and verification fields
    worker_selected_language = models.CharField(max_length=15, blank=True, null=True, db_index=True)
    translation_confidence = models.FloatField(blank=True, null=True)
    speech_processing_duration_ms = models.IntegerField(blank=True, null=True)
    translation_language_pair = models.CharField(max_length=20, blank=True, null=True)
    translation_verification_result = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference_number} - {self.category} ({self.status})"


class SpeechProcessingLog(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='speech_logs')
    attempt_number = models.IntegerField()
    status = models.CharField(max_length=50)
    error_message = models.TextField(blank=True, null=True)
    processing_time_ms = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Phase 5.6 verification fields
    verification_score = models.FloatField(blank=True, null=True)
    verification_result = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.complaint.reference_number} - Attempt {self.attempt_number} ({self.status})"



# --- New Phase 5 Models ---

class Notification(models.Model):
    TYPE_CHOICES = [
        ('complaint_created', 'Complaint Created'),
        ('complaint_updated', 'Complaint Updated'),
        ('user_created', 'User Created'),
        ('user_disabled', 'User Disabled'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.notification_type} ({'Read' if self.is_read else 'Unread'})"


class UserActivity(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    username = models.CharField(max_length=150, db_index=True)
    login_time = models.DateTimeField(null=True, blank=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    session_duration = models.IntegerField(null=True, blank=True, help_text="Session duration in seconds")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    browser = models.CharField(max_length=255, null=True, blank=True)
    device_type = models.CharField(max_length=50, null=True, blank=True)
    activity_type = models.CharField(max_length=50, db_index=True) # e.g. login, logout, failed_login

    class Meta:
        ordering = ['-login_time']

    def __str__(self):
        return f"{self.username} - {self.activity_type} at {self.login_time or self.logout_time}"


class ComplaintStatusHistory(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='status_history', db_index=True)
    previous_status = models.CharField(max_length=50)
    new_status = models.CharField(max_length=50)
    updated_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.complaint.reference_number} changed to {self.new_status} at {self.timestamp}"


class LoginLockout(models.Model):
    username = models.CharField(max_length=150, unique=True, db_index=True)
    failed_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True, db_index=True)

    def __str__(self):
        return f"{self.username} - Attempts: {self.failed_attempts} (Locked: {self.locked_until})"


class FallbackRateLimitLog(models.Model):
    ip_address = models.GenericIPAddressField(db_index=True)
    endpoint = models.CharField(max_length=255, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.ip_address} - {self.endpoint} at {self.timestamp}"


class BackupLog(models.Model):
    backup_type = models.CharField(max_length=50, db_index=True)  # manual, scheduled, database, media, etc.
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)  # size in bytes
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=50, db_index=True)  # SUCCESS, FAILED, CORRUPTED
    restore_tested = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.file_name} ({self.backup_type}) - Status: {self.status}"


class QueueFailureLog(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='queue_failures', null=True, blank=True)
    exception_message = models.TextField()
    traceback_summary = models.TextField()
    attempt_count = models.IntegerField(default=1)
    failed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-failed_at']

    def __str__(self):
        ref = self.complaint.reference_number if self.complaint else "None"
        return f"Queue Failure for Complaint {ref} at {self.failed_at}"


class SystemErrorLog(models.Model):
    ERROR_TYPE_CHOICES = [
        ('speech', 'Speech Errors'),
        ('queue', 'Queue Errors'),
        ('authentication', 'Authentication Errors'),
        ('export', 'Export Errors'),
        ('general', 'General Errors'),
    ]
    error_type = models.CharField(max_length=50, choices=ERROR_TYPE_CHOICES, db_index=True)
    message = models.TextField()
    traceback_summary = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.error_type}] {self.message[:50]}"


class SecurityEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('failed_login', 'Failed Login'),
        ('account_lockout', 'Account Lockout'),
        ('rate_limit_exceeded', 'Rate Limit Exceeded'),
        ('suspicious_activity', 'Suspicious Activity'),
    ]
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    username = models.CharField(max_length=150, null=True, blank=True, db_index=True)
    details = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.event_type}] {self.username or 'IP: '+str(self.ip_address)} at {self.created_at}"


class BusinessUnit(models.Model):
    name = models.CharField(max_length=255, unique=True, help_text="Business Unit name")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']

    def __str__(self):
        return f"{self.key} = {self.value}"

    @classmethod
    def get_setting(cls, key, default=None):
        try:
            return cls.objects.get(key=key).value
        except Exception:
            from django.conf import settings
            return getattr(settings, key, default)


