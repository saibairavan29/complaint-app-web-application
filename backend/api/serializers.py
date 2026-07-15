from rest_framework import serializers
from api.models import Project, Location, Complaint, Notification, UserActivity, ComplaintStatusHistory, SpeechProcessingLog, Category, Language
from django.contrib.auth import get_user_model
import random
from datetime import datetime
from api.utils import CATEGORY_TRANSLATIONS, get_bilingual_name, get_bilingual_category

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
    project_name = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()
    speech_logs = SpeechProcessingLogSerializer(many=True, read_only=True)

    def get_project_name(self, obj):
        return get_bilingual_name(obj.project, obj.language or 'en')

    def get_location_name(self, obj):
        return get_bilingual_name(obj.location, obj.language or 'en')

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

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['category'] = get_bilingual_category(instance.category, instance.language or 'en')
        return rep

    def create(self, validated_data):
        from django.db import transaction, IntegrityError
        
        attempts = 0
        while attempts < 10:
            try:
                with transaction.atomic():
                    year = datetime.now().year
                    rand_code = random.randint(10000, 99999)
                    ref_num = f"CMP-{year}-{rand_code}"
                    if not Complaint.objects.filter(reference_number=ref_num).exists():
                        validated_data['reference_number'] = ref_num
                        return super().create(validated_data)
            except IntegrityError:
                pass
            attempts += 1
            
        # Fallback in case of 10 straight failures
        year = datetime.now().year
        rand_code = random.randint(100000, 999999)
        validated_data['reference_number'] = f"CMP-{year}-{rand_code}"
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
