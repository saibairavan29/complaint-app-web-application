import os
import django
from django.utils import timezone
import sys

# Support UTF-8 print encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Bootstrap Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'complaint_portal.settings')
django.setup()

from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.test import Client
from django.contrib.auth import get_user_model
from api.models import Complaint, SpeechProcessingLog
from api.speech_intelligence import transcribe_and_translate_audio_task

def run_phase5_5_tests():
    print("=== PHASE 5.5 ENTERPRISE SPEECH INTELLIGENCE VERIFICATION ===")
    
    User = get_user_model()
    # Clean up previous test users if any
    User.objects.filter(username__in=['speech_admin_test']).delete()
    Complaint.objects.filter(reference_number__startswith='CMP-TEST-').delete()
    
    print("1. Creating test administrator user...")
    admin_user = User.objects.create_superuser(username='speech_admin_test', email='speech@test.com', password='password123')
    
    client = Client()
    login_res = client.post('/api/admin/login/', {'username': 'speech_admin_test', 'password': 'password123'}, content_type='application/json')
    assert login_res.status_code == 200, "Admin login failed"
    
    # We need a project and location for testing. Let's fetch one from database or create it
    from api.models import Project, Location
    project = Project.objects.first()
    if not project:
        project = Project.objects.create(name="Test Speech Project")
    location = project.locations.first()
    if not location:
        location = Location.objects.create(project=project, name="Test Speech Location")

    print("\n2. Testing Complaint Submission with Audio (Asynchronous STT)...")
    # Simulate worker submit audio complaint
    # Submission type: VOICE, has_audio: True
    submit_res = client.post('/api/complaints/', {
        'project': project.id,
        'location': location.id,
        'category': 'water',
        'language': 'hi',
        'submission_type': 'VOICE',
        'has_audio': True,
        'audio_url': 'http://demo-audio-original.wav',
        'audio_duration_seconds': 5.2
    }, format='multipart') # multipart or default form-data
    
    print(f"   POST /api/complaints/: Status {submit_res.status_code} (Expected 201)")
    assert submit_res.status_code == 201, f"Expected 201, got {submit_res.status_code}"
    
    complaint_data = submit_res.json()
    complaint_id = complaint_data['data']['id']
    ref_num = complaint_data['data']['reference_number']
    print(f"   Created Complaint ID: {complaint_id}, Ref Code: {ref_num}")
    
    # Assert status is PENDING immediately
    complaint = Complaint.objects.get(id=complaint_id)
    print(f"   Initial transcription_status: '{complaint.transcription_status}' (Expected 'PENDING')")
    print(f"   Initial translation_status: '{complaint.translation_status}' (Expected 'PENDING')")
    assert complaint.transcription_status == 'PENDING'
    assert complaint.translation_status == 'PENDING'
    
    print("\n3. Simulating Background Worker Execution...")
    # Invoke the background task synchronously to verify behavior
    transcribe_and_translate_audio_task(complaint.id)
    
    # Re-fetch from db
    complaint.refresh_from_db()
    print(f"   Post-processing transcription_status: '{complaint.transcription_status}' (Expected 'COMPLETED' via fallback)")
    print(f"   Post-processing translation_status: '{complaint.translation_status}' (Expected 'COMPLETED' via fallback)")
    print(f"   Detected language: '{complaint.detected_language}' (Expected 'Hindi')")
    print(f"   Confidence Score: {complaint.transcript_confidence} (Expected 0.96)")
    print(f"   Transcript: '{complaint.transcript}'")
    print(f"   Translation: '{complaint.english_translation}'")
    
    assert complaint.transcription_status == 'COMPLETED'
    assert complaint.translation_status == 'COMPLETED'
    assert complaint.detected_language == 'Hindi'
    
    # Check that a SpeechProcessingLog was written
    logs = SpeechProcessingLog.objects.filter(complaint=complaint)
    print(f"   Speech logs created count: {logs.count()} (Expected >= 1)")
    assert logs.count() >= 1
    for log in logs:
        print(f"     Log attempt #{log.attempt_number}: status={log.status}, duration={log.processing_time_ms}ms, msg='{log.error_message}'")
    
    print("\n4. Testing Dropdown Query Filters...")
    # has_audio = True
    res_filter_audio = client.get('/api/complaints/?has_audio=true')
    assert res_filter_audio.status_code == 200
    print(f"   Filter has_audio=true: {res_filter_audio.json()['count']} complaints returned")
    
    # submission_type = VOICE
    res_filter_type = client.get('/api/complaints/?submission_type=VOICE')
    assert res_filter_type.status_code == 200
    print(f"   Filter submission_type=VOICE: {res_filter_type.json()['count']} complaints returned")
    
    # transcription_status = COMPLETED
    res_filter_status = client.get('/api/complaints/?transcription_status=COMPLETED')
    assert res_filter_status.status_code == 200
    print(f"   Filter transcription_status=COMPLETED: {res_filter_status.json()['count']} complaints returned")

    print("\n5. Testing Single Reprocessing Action...")
    reprocess_res = client.post(f'/api/complaints/{complaint.id}/reprocess/')
    print(f"   POST /api/complaints/{complaint.id}/reprocess/: Status {reprocess_res.status_code} (Expected 200)")
    assert reprocess_res.status_code == 200
    
    complaint.refresh_from_db()
    print(f"   After reprocess request transcription_status: '{complaint.transcription_status}' (Expected 'PENDING')")
    assert complaint.transcription_status == 'PENDING'
    
    # Re-run transcription to set back to Completed
    transcribe_and_translate_audio_task(complaint.id)
    complaint.refresh_from_db()
    assert complaint.transcription_status == 'COMPLETED'

    print("\n6. Testing Bulk Reprocessing Action...")
    # Force status to FAILED for testing bulk
    complaint.transcription_status = 'FAILED'
    complaint.save()
    
    bulk_res = client.post('/api/complaints/bulk-reprocess/', {
        'ids': [complaint.id]
    }, content_type='application/json')
    print(f"   POST /api/complaints/bulk-reprocess/: Status {bulk_res.status_code} (Expected 200)")
    assert bulk_res.status_code == 200
    
    complaint.refresh_from_db()
    print(f"   After bulk-reprocess request transcription_status: '{complaint.transcription_status}' (Expected 'PENDING')")
    assert complaint.transcription_status == 'PENDING'

    print("\n7. Testing Dashboard summary KPIs...")
    summary_res = client.get('/api/dashboard/summary/')
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    
    # Display the queue KPIs
    speech_summary = summary_data.get('speech_stats', {})
    print(f"   Speech Success Rate KPI: {speech_summary.get('success_rate')}%")
    print(f"   Speech Pending Jobs: {speech_summary.get('pending_audio')}")
    print(f"   Speech Processing Jobs: {speech_summary.get('processing_audio')}")
    print(f"   Speech Retrying Jobs: {speech_summary.get('retrying_audio')}")
    print(f"   Speech Failed Jobs: {speech_summary.get('failed_audio')}")
    print(f"   Speech Completed Jobs: {speech_summary.get('completed_audio')}")
    print(f"   Speech Average Audio Length: {speech_summary.get('avg_audio_duration')} seconds")
    print(f"   Speech Average Processing Time: {speech_summary.get('avg_processing_time_ms')} ms")
    
    # Clean up test user & complaints
    User.objects.filter(username__in=['speech_admin_test']).delete()
    Complaint.objects.filter(id=complaint.id).delete()
    
    print("\nALL PHASE 5.5 SPEECH INTELLIGENCE VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_phase5_5_tests()
