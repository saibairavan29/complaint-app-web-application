import os
import django
import sys
import tempfile
import wave
import struct
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

# Support UTF-8 print encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Bootstrap Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'complaint_portal.settings')
django.setup()

if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.test import Client
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from api.models import Project, Location, Complaint, SpeechProcessingLog
from api.speech_intelligence import verify_speech_transcription_task, calculate_similarity

def run_phase5_6_tests():
    print("=== PHASE 5.6 ENTERPRISE AUDIT, LOCALIZATION & ANALYTICS VERIFICATION ===")

    User = get_user_model()
    # Clean previous test users/data
    User.objects.filter(username__in=['analytics_admin_test']).delete()
    Complaint.objects.filter(reference_number__startswith='CMP-TEST-').delete()
    Project.objects.filter(name__startswith='Phase 5.6 Test').delete()

    print("1. Creating test administrator user...")
    admin_user = User.objects.create_superuser(username='analytics_admin_test', email='analytics@test.com', password='password123')
    
    client = Client()
    login_res = client.post('/api/admin/login/', {'username': 'analytics_admin_test', 'password': 'password123'}, content_type='application/json')
    assert login_res.status_code == 200, "Admin login failed"

    print("\n2. Testing Database Localization via JSONField...")
    # Test JSONField translations storage on Project and Location models
    project = Project.objects.create(
        name="Phase 5.6 Test Project",
        localized_names={
            "en": "Phase 5.6 Test Project",
            "hi": "चरण 5.6 परीक्षण परियोजना",
            "ta": "கட்டம் 5.6 சோதனை திட்டம்"
        }
    )
    
    location = Location.objects.create(
        project=project,
        name="Test Camp Area",
        localized_names={
            "en": "Test Camp Area",
            "hi": "परीक्षण शिविर क्षेत्र",
            "ta": "சோதனை முகாம் பகுதி"
        }
    )

    db_proj = Project.objects.get(id=project.id)
    db_loc = Location.objects.get(id=location.id)
    
    print(f"   Project Translations: {db_proj.localized_names}")
    print(f"   Location Translations: {db_loc.localized_names}")
    
    assert db_proj.localized_names.get("hi") == "चरण 5.6 परीक्षण परियोजना"
    assert db_loc.localized_names.get("ta") == "சோதனை முகாம் பகுதி"

    print("\n3. Testing Speech Preview API Endpoint...")
    # Generate dummy WAV file
    temp_wav_path = os.path.join(tempfile.gettempdir(), "test_preview_dummy.wav")
    with wave.open(temp_wav_path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        # write 0.5 seconds of quiet audio
        frames = struct.pack(f"<{8000}h", *[0]*8000)
        w.writeframes(frames)
    
    with open(temp_wav_path, 'rb') as fp:
        upload_file = SimpleUploadedFile("audio.wav", fp.read(), content_type="audio/wav")

    preview_res = client.post('/api/complaints/preview-speech/', {
        'audio': upload_file,
        'language': 'hi',
        'category': 'water'
    })
    
    print(f"   POST /api/complaints/preview-speech/ status code: {preview_res.status_code}")
    assert preview_res.status_code == 200, "Preview endpoint failed"
    
    preview_data = preview_res.json()
    print(f"   Preview output fields:")
    print(f"     transcript: '{preview_data.get('transcript')}'")
    print(f"     english_translation: '{preview_data.get('english_translation')}'")
    print(f"     detected_language: '{preview_data.get('detected_language')}'")
    print(f"     confidence_percentage: {preview_data.get('confidence_percentage')}%")
    print(f"     translation_confidence: {preview_data.get('translation_confidence')}")
    print(f"     translation_language_pair: '{preview_data.get('translation_language_pair')}'")
    print(f"     processing_time_ms: {preview_data.get('processing_time_ms')} ms")

    assert "transcript" in preview_data
    assert "english_translation" in preview_data
    assert "detected_language" in preview_data
    assert "confidence_percentage" in preview_data
    assert "translation_confidence" in preview_data

    # Cleanup temp wav file
    if os.path.exists(temp_wav_path):
        os.remove(temp_wav_path)

    print("\n4. Testing Hybrid Speech Verification Engine (SequenceMatcher + Jaccard)...")
    # Verify calculate_similarity helper function
    similarity1 = calculate_similarity("water tank area clean", "Water tank area is clean.")
    similarity2 = calculate_similarity("water tank area clean", "room light fan not working")
    print(f"   Similarity (matches): {similarity1:.2f} (Expected close to 1.0)")
    print(f"   Similarity (mismatches): {similarity2:.2f} (Expected close to 0.0)")
    assert similarity1 >= 0.85
    assert similarity2 <= 0.30

    # Submit a complaint with simulated matched details
    print("   Submitting Matched Preview Complaint...")
    matched_complaint = Complaint.objects.create(
        project=project,
        location=location,
        category="water",
        language="hi",
        submission_type="VOICE",
        has_audio=True,
        original_audio_url="http://demo-original.wav",
        reference_number="CMP-TEST-561",
        # Client pre-populated values
        transcript="यहाँ पीने के पानी की टंकी बहुत गंदी है।",
        english_translation="The drinking water tank here is very dirty.",
        detected_language="Hindi"
    )
    
    # Run verification task synchronously
    verify_speech_transcription_task(matched_complaint.id)
    matched_complaint.refresh_from_db()
    
    print(f"   Verification score for matched preview result: {matched_complaint.translation_verification_result}")
    print(f"   Saved speech duration: {matched_complaint.speech_processing_duration_ms} ms")
    print(f"   Saved translation confidence: {matched_complaint.translation_confidence}")
    print(f"   Saved translation language pair: '{matched_complaint.translation_language_pair}'")
    
    # Check SpeechProcessingLog entries
    log_matched = SpeechProcessingLog.objects.filter(complaint=matched_complaint).first()
    assert log_matched is not None
    print(f"   Processing log - Score: {log_matched.verification_score:.2f}, Result: '{log_matched.verification_result}'")
    
    # Since mock fallback generates the exact same string, they match
    assert matched_complaint.translation_verification_result in ['VERIFIED', 'FALLBACK_TRANSLATION']

    # Submit a complaint with simulated mismatched details
    print("\n   Submitting Mismatched Preview Complaint (client side manipulated)...")
    mismatched_complaint = Complaint.objects.create(
        project=project,
        location=location,
        category="toilet",
        language="hi",
        submission_type="VOICE",
        has_audio=True,
        original_audio_url="http://demo-original-mismatch.wav",
        reference_number="CMP-TEST-562",
        # client text is totally different from fallback generator for hi/toilet
        transcript="room is clean no problem at all",
        english_translation="room is clean no problem at all",
        detected_language="English"
    )
    
    # Force verification task to run. It uses mock fallback (generates toilet-related text)
    # The similarity of client "room is clean..." and fallback "toilet is dirty..." will be < 90%.
    verify_speech_transcription_task(mismatched_complaint.id)
    mismatched_complaint.refresh_from_db()
    
    print(f"   Verification score for mismatched preview: {mismatched_complaint.translation_verification_result}")
    print(f"   Updated transcript: '{mismatched_complaint.transcript}'")
    print(f"   Updated translation: '{mismatched_complaint.english_translation}'")
    
    log_mismatched = SpeechProcessingLog.objects.filter(complaint=mismatched_complaint).first()
    print(f"   Processing log - Score: {log_mismatched.verification_score:.2f}, Result: '{log_mismatched.verification_result}'")
    
    # Mismatch check: it must overwrite the client transcript and mark MISMATCH_REPLACED (or FALLBACK_TRANSLATION in mock runs)
    assert mismatched_complaint.translation_verification_result in ['MISMATCH_REPLACED', 'FALLBACK_TRANSLATION']
    assert log_mismatched.verification_result in ['MISMATCH_REPLACED', 'FALLBACK_TRANSLATION']
    assert "शौचालय" in mismatched_complaint.transcript # Hindi fallback for toilet

    print("\n5. Testing Backend-Driven Dashboard Analytics Endpoint...")
    # Add status filtering and check response
    analytics_res = client.get(f'/api/dashboard/analytics/?range_type=30days&project={project.id}&location={location.id}')
    assert analytics_res.status_code == 200, "Analytics endpoint failed"
    analytics_data = analytics_res.json()
    
    print("   Analytics JSON keys returned:")
    for key in analytics_data.keys():
        print(f"     - {key}")
        
    assert "status_distribution" in analytics_data
    assert "category_distribution" in analytics_data
    assert "project_distribution" in analytics_data
    assert "location_distribution" in analytics_data
    assert "monthly_trend" in analytics_data
    assert "drilldown_complaints" in analytics_data
    assert "summary_stats" in analytics_data
    
    # Assert counts in summary stats
    print(f"   Summary stats returned: {analytics_data['summary_stats']}")
    assert analytics_data['summary_stats']['total_complaints'] >= 2

    # Date range filters checks (today, 7days, 30days, custom)
    today_res = client.get('/api/dashboard/analytics/?range_type=today')
    assert today_res.status_code == 200
    
    sevendays_res = client.get('/api/dashboard/analytics/?range_type=7days')
    assert sevendays_res.status_code == 200
    
    custom_res = client.get(f'/api/dashboard/analytics/?range_type=custom&start_date={(timezone.now() - timedelta(days=1)).date()}&end_date={timezone.now().date()}')
    assert custom_res.status_code == 200
    
    print("   Analytics Date Range filters are valid!")

    print("\n6. Testing Operational Data Spreadsheet Export...")
    export_res = client.get(f'/api/dashboard/export/?range_type=30days&project={project.id}')
    assert export_res.status_code == 200, "Excel Export failed"
    assert export_res.get('Content-Type') == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Invalid content type"
    print(f"   Export status: 200 OK. Content-Disposition: {export_res.get('Content-Disposition')}")

    # Clean up test database instances
    User.objects.filter(username__in=['analytics_admin_test']).delete()
    Complaint.objects.filter(reference_number__startswith='CMP-TEST-').delete()
    Project.objects.filter(name__startswith='Phase 5.6 Test').delete()

    print("\nALL PHASE 5.6 API OPERATIONAL AND AUDIT VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_phase5_6_tests()
