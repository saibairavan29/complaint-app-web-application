import os
import django
import sys
import tempfile
import zipfile
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
from django.core.cache import cache
from api.models import (
    Project, Location, Complaint, BackupLog, FallbackRateLimitLog,
    QueueFailureLog, SystemErrorLog, SecurityEvent, LoginLockout
)
from api.rate_limit import check_rate_limit
from api.lockout import is_account_locked, register_failed_attempt, register_successful_login
from api.backup_manager import perform_database_backup, perform_media_backup, restore_database_backup
from api.speech_intelligence import verify_speech_transcription_task

def run_phase6_tests():
    print("=== PHASE 6 PRODUCTION-READY DIAGNOSTICS & HARDENING VERIFICATION ===")

    # Clear previous test telemetry/cache
    cache.clear()
    
    User = get_user_model()
    # Clean previous test users
    User.objects.filter(username__in=['phase6_admin_test', 'lockout_test_user']).delete()
    LoginLockout.objects.filter(username__in=['phase6_admin_test', 'lockout_test_user']).delete()
    BackupLog.objects.all().delete()
    QueueFailureLog.objects.all().delete()
    SystemErrorLog.objects.all().delete()
    SecurityEvent.objects.all().delete()
    FallbackRateLimitLog.objects.all().delete()

    print("1. Creating test administrator user...")
    admin_user = User.objects.create_superuser(username='phase6_admin_test', email='phase6@test.com', password='password123')
    
    client = Client()
    
    # Assert successful login resets lockout attempt tracker
    login_res = client.post('/api/admin/login/', {'username': 'phase6_admin_test', 'password': 'password123'}, content_type='application/json')
    assert login_res.status_code == 200, "Admin login failed"
    
    print("\n2. Testing Deployment Health Endpoint...")
    health_res = client.get('/api/health/')
    print(f"   GET /api/health/ status code: {health_res.status_code}")
    assert health_res.status_code == 200
    health_data = health_res.json()
    print(f"   Health Data Keys: {list(health_data.keys())}")
    assert 'status' in health_data
    assert 'database' in health_data
    assert 'queue' in health_data
    assert 'storage' in health_data
    assert 'speech' in health_data
    
    print("\n3. Testing Cache-Based Rate Limiting on Speech Previews...")
    # Trigger 5 speech preview requests (limit is 5/min)
    # Generate dummy WAV file
    temp_wav_path = os.path.join(tempfile.gettempdir(), "test_preview_dummy.wav")
    with wave.open(temp_wav_path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        frames = struct.pack(f"<{8000}h", *[0]*8000)
        w.writeframes(frames)

    # 5 attempts should pass or fail normally, 6th attempt must be blocked by rate limiter
    for i in range(1, 7):
        with open(temp_wav_path, 'rb') as fp:
            preview_res = client.post('/api/complaints/preview-speech/', {
                'audio': fp,
                'language': 'en',
                'category': 'water'
            })
        print(f"   Attempt {i} status code: {preview_res.status_code}")
        if i <= 5:
            # Should be OK (200)
            assert preview_res.status_code in [200, 400]
        else:
            # 6th should be Rate Limited (429)
            assert preview_res.status_code == 429
            print("   -> 6th attempt successfully rate-limited (429)!")

    # Check that a rate limit exceeded SecurityEvent was logged
    rl_events = SecurityEvent.objects.filter(event_type='rate_limit_exceeded')
    assert rl_events.exists(), "No rate limit security event logged"
    print(f"   Rate limit security event: {rl_events.first().details}")

    print("\n4. Testing Account Lockout Policy...")
    cache.clear() # Clear cache to reset IP rate limit counter for login tests
    # Attempt wrong password 5 times to trigger a 15 minute lockout
    for i in range(1, 6):
        wrong_res = client.post('/api/admin/login/', {'username': 'lockout_test_user', 'password': 'wrongpassword'}, content_type='application/json')
        print(f"   Failed login attempt {i} status: {wrong_res.status_code}")
    
    # 6th login attempt (even with CORRECT credentials, if created) should block with 403 Forbidden
    cache.clear() # Reset IP rate limit counter before 6th attempt
    locked_res = client.post('/api/admin/login/', {'username': 'lockout_test_user', 'password': 'correct_or_wrong'}, content_type='application/json')
    print(f"   6th attempt status (expected 403): {locked_res.status_code}")
    assert locked_res.status_code == 403
    assert "locked" in locked_res.json().get("detail", "").lower()
    print("   -> Account lockout successfully enforced (403)!")

    # Verify lockout SecurityEvent exists
    lock_events = SecurityEvent.objects.filter(event_type='account_lockout', username='lockout_test_user')
    assert lock_events.exists(), "No account lockout security event logged"
    print(f"   Lockout security event: {lock_events.first().details}")

    print("\n5. Testing Queue Failure Diagnostics...")
    # Trigger task verify_speech_transcription_task with string ID to force a ValueError failure
    try:
        verify_speech_transcription_task("invalid_string_id")
    except Exception:
        # Expected to raise exception
        pass
        
    # Assert QueueFailureLog and SystemErrorLog exist
    q_fails = QueueFailureLog.objects.all()
    assert q_fails.exists(), "No queue failure log captured"
    print(f"   Queue failure recorded: {q_fails.first().exception_message}")
    
    err_logs = SystemErrorLog.objects.filter(error_type='queue')
    assert err_logs.exists(), "No system queue error logged"
    print(f"   System error log: {err_logs.first().message}")

    print("\n6. Testing Backup Manager Validation & Restores...")
    # Create DB backup
    status_db, filename_db, size_db = perform_database_backup()
    print(f"   DB Backup status: {status_db}, File: {filename_db}, Size: {size_db} bytes")
    assert status_db == 'SUCCESS'
    assert size_db > 0
    
    # Assert BackupLog entry exists
    db_logs = BackupLog.objects.filter(file_name=filename_db)
    assert db_logs.exists()
    assert db_logs.first().status == 'SUCCESS'
    
    # Restore DB backup
    success_restore, msg_restore = restore_database_backup(filename_db)
    print(f"   Restore status: {success_restore}, Message: {msg_restore}")
    assert success_restore
    
    # Verify restore tested flag updated in BackupLog
    db_logs = BackupLog.objects.filter(file_name=filename_db)
    assert db_logs.first().restore_tested == True
    print("   -> Backup generation and validation passes successfully!")

    print("\n7. Testing System Observability Diagnostics View...")
    # Authenticate client
    client.force_login(admin_user)
    diag_res = client.get('/api/dashboard/diagnostics/')
    print(f"   GET /api/dashboard/diagnostics/ status code: {diag_res.status_code}")
    assert diag_res.status_code == 200
    diag_data = diag_res.json()
    
    assert 'api_metrics' in diag_data
    assert 'speech_metrics' in diag_data
    assert 'queue_metrics' in diag_data
    assert 'errors' in diag_data
    assert 'security' in diag_data
    assert 'backups' in diag_data
    assert 'queue_failures' in diag_data
    print("   -> Observability Diagnostics payload successfully loaded!")

    # Cleanup temp wav file
    if os.path.exists(temp_wav_path):
        os.remove(temp_wav_path)
        
    print("\n=== ALL PHASE 6 PRODUCTION READINESS TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_phase6_tests()
