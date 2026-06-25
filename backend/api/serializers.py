from rest_framework import serializers
from api.models import Project, Location, Complaint, Notification, UserActivity, ComplaintStatusHistory, SpeechProcessingLog, Category, Language
from django.contrib.auth import get_user_model
import random
from datetime import datetime

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'business_unit', 'localized_names', 'is_active', 'created_at']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'project', 'name', 'localized_names', 'is_active', 'created_at']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'slug', 'label', 'localized_labels', 'is_active', 'sort_order', 'created_at']


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ['id', 'code', 'name', 'localized_names', 'is_active', 'sort_order', 'created_at']


class SpeechProcessingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpeechProcessingLog
        fields = ['id', 'attempt_number', 'status', 'error_message', 'processing_time_ms', 'created_at', 'verification_score', 'verification_result']


class ComplaintSerializer(serializers.ModelSerializer):
    # Enable reading names of project and location in GET responses, but writing IDs in POST requests
    project_name = serializers.ReadOnlyField(source='project.name')
    location_name = serializers.ReadOnlyField(source='location.name')
    speech_logs = SpeechProcessingLogSerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'id', 
            'project', 
            'project_name',
            'business_unit',
            'location', 
            'location_name', 
            'category', 
            'language', 
            'status', 
            'created_at',
            'updated_at',
            'photo_url', 
            'audio_url', 
            'original_text', 
            'english_translation',
            'reference_number',
            
            # STT integration fields
            'transcript',
            'detected_language',
            'transcript_confidence',
            'has_audio',
            'transcription_status',
            'translation_status',
            'audio_duration_seconds',
            'submission_type',
            'last_transcription_attempt',
            'original_audio_url',
            'normalized_audio_url',
            'transcription_error',
            'speech_logs',

            # Phase 5.6 fields
            'worker_selected_language',
            'translation_confidence',
            'speech_processing_duration_ms',
            'translation_language_pair',
            'translation_verification_result'
        ]
        read_only_fields = [
            'reference_number', 
            'status',
            'business_unit',
            'updated_at',
            'transcription_status',
            'translation_status',
            'transcript_confidence',
            'detected_language',
            'last_transcription_attempt',
            'transcript',
            'normalized_audio_url',
            'transcription_error',
            
            'translation_verification_result',
            'translation_confidence',
            'speech_processing_duration_ms',
            'translation_language_pair'
        ]

    def create(self, validated_data):
        # Automatically generate unique reference number: CMP-YYYY-XXXXX
        year = datetime.now().year
        while True:
            rand_code = random.randint(10000, 99999)
            ref_num = f"CMP-{year}-{rand_code}"
            if not Complaint.objects.filter(reference_number=ref_num).exists():
                validated_data['reference_number'] = ref_num
                break
        
        return super().create(validated_data)


# --- New Phase 5 Serializers ---

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'description', 'is_read', 'read_at', 'notification_type', 'created_at']


class UserActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserActivity
        fields = '__all__'


class ComplaintStatusHistorySerializer(serializers.ModelSerializer):
    updated_by_username = serializers.ReadOnlyField(source='updated_by.username')

    class Meta:
        model = ComplaintStatusHistory
        fields = ['id', 'complaint', 'previous_status', 'new_status', 'updated_by', 'updated_by_username', 'timestamp']


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'email', 'is_staff', 'is_superuser', 'is_active', 'last_login', 'date_joined']
        read_only_fields = ['last_login', 'date_joined']
