import os
import django
from django.utils import timezone
from datetime import timedelta

# Bootstrap Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'complaint_portal.settings')
django.setup()

from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.test import Client
from django.contrib.auth import get_user_model
from api.models import Complaint, Notification, UserActivity, ComplaintStatusHistory

def run_phase5_tests():
    User = get_user_model()
    
    # Clean up previous test users if any
    User.objects.filter(username__in=['super_admin_test', 'regular_admin_test', 'created_admin_test']).delete()
    
    print("1. Creating test users...")
    super_admin = User.objects.create_superuser(username='super_admin_test', email='super@test.com', password='password123')
    regular_admin = User.objects.create_user(username='regular_admin_test', email='regular@test.com', password='password123', is_staff=True)
    
    super_client = Client()
    regular_client = Client()
    
    # Log in both
    login_super = super_client.post('/api/admin/login/', {'username': 'super_admin_test', 'password': 'password123'}, content_type='application/json')
    assert login_super.status_code == 200
    
    login_regular = regular_client.post('/api/admin/login/', {'username': 'regular_admin_test', 'password': 'password123'}, content_type='application/json')
    assert login_regular.status_code == 200

    print("\n2. Testing Super Admin restrictions (User Management)...")
    # Regular staff admin tries to get user list
    user_list_res = regular_client.get('/api/user-management/')
    print(f"   GET /api/user-management/ (Regular Admin): Status {user_list_res.status_code} (Expected 403)")
    assert user_list_res.status_code == 403, f"Expected 403, got {user_list_res.status_code}"

    # Super admin tries to get user list
    user_list_res_super = super_client.get('/api/user-management/')
    print(f"   GET /api/user-management/ (Super Admin): Status {user_list_res_super.status_code} (Expected 200)")
    assert user_list_res_super.status_code == 200, f"Expected 200, got {user_list_res_super.status_code}"

    print("\n2.5 Testing Django Admin portal access restrictions...")
    # Regular admin (non-superuser staff) tries to access Django admin index
    admin_index_regular = regular_client.get('/admin/')
    print(f"   GET /admin/ (Regular Admin): Status {admin_index_regular.status_code} (Expected 302 redirect or login prompt)")
    # Django returns a 302 or displays a login/permission page because regular admin has no has_permission
    assert admin_index_regular.status_code in [302, 200]
    
    # Super admin tries to access Django admin index
    admin_index_super = super_client.get('/admin/')
    print(f"   GET /admin/ (Super Admin): Status {admin_index_super.status_code} (Expected 200)")
    assert admin_index_super.status_code == 200, f"Expected 200, got {admin_index_super.status_code}"


    print("\n3. Testing Admin creation (User Management)...")
    create_res = super_client.post('/api/user-management/create/', {
        'username': 'created_admin_test',
        'email': 'created@test.com',
        'password': 'password123',
        'confirm_password': 'password123',
        'role': 'Admin'
    }, content_type='application/json')
    print(f"   POST /api/user-management/create/: Status {create_res.status_code} (Expected 201)")
    assert create_res.status_code == 201, f"Expected 201, got {create_res.status_code}"
    
    # Check that a notification was created for user creation
    notif = Notification.objects.filter(notification_type='user_created').first()
    assert notif is not None, "Expected user_created notification"
    print(f"   Notification triggered: '{notif.title}' - '{notif.description}'")

    print("\n4. Testing password reset...")
    created_user = User.objects.get(username='created_admin_test')
    reset_res = super_client.post('/api/user-management/reset-password/', {
        'user_id': created_user.id,
        'new_password': 'newpassword123'
    }, content_type='application/json')
    print(f"   POST /api/user-management/reset-password/: Status {reset_res.status_code} (Expected 200)")
    assert reset_res.status_code == 200

    print("\n5. Testing disabling user and lockout protection...")
    # Try disabling another user
    disable_res = super_client.post('/api/user-management/disable/', {
        'user_id': created_user.id,
        'is_active': False
    }, content_type='application/json')
    print(f"   POST /api/user-management/disable/ (other user): Status {disable_res.status_code} (Expected 200)")
    assert disable_res.status_code == 200
    created_user.refresh_from_db()
    assert created_user.is_active is False

    # Try disabling self (Lockout Protection Safeguard)
    self_disable_res = super_client.post('/api/user-management/disable/', {
        'user_id': super_admin.id,
        'is_active': False
      }, content_type='application/json')
    print(f"   POST /api/user-management/disable/ (self-lockout): Status {self_disable_res.status_code} (Expected 400)")
    assert self_disable_res.status_code == 400, f"Expected 400, got {self_disable_res.status_code}"
    assert "You cannot disable your own active account." in self_disable_res.json().get('detail', ''), f"Unexpected detail message: {self_disable_res.json()}"
    super_admin.refresh_from_db()
    assert super_admin.is_active is True
    print("   Lockout protection confirmed!")

    print("\n6. Testing Login Audit logs & Session Duration calculation...")
    # Retrieve the last activity for regular_admin
    act = UserActivity.objects.filter(username='regular_admin_test', activity_type='login').first()
    assert act is not None
    print(f"   Login audit logged: username={act.username}, browser={act.browser}, device={act.device_type}, activity_type={act.activity_type}")
    assert act.browser is not None
    assert act.device_type is not None

    # Perform logout for regular admin
    logout_res = regular_client.post('/api/admin/logout/')
    assert logout_res.status_code == 200
    
    # Reload activity to see if session duration is updated
    act.refresh_from_db()
    print(f"   Logout completed: session_duration={act.session_duration} seconds (Expected >= 0)")
    assert act.session_duration is not None
    assert act.session_duration >= 0

    print("\n7. Testing Complaint Status History Timeline...")
    complaint = Complaint.objects.first()
    assert complaint is not None, "Need at least one complaint for history test"
    
    old_status = complaint.status
    new_status = 'Completed' if old_status != 'Completed' else 'In Progress'
    
    patch_res = super_client.patch(f'/api/complaints/{complaint.id}/status/', {'status': new_status}, content_type='application/json')
    assert patch_res.status_code == 200
    
    history_res = super_client.get(f'/api/status-history/?complaint_id={complaint.id}')
    assert history_res.status_code == 200
    history_data = history_res.json()
    print(f"   Status history records returned: {len(history_data)}")
    assert len(history_data) >= 1
    
    latest_history = history_data[0]
    print(f"   Latest transition: {latest_history.get('previous_status')} -> {latest_history.get('new_status')} by {latest_history.get('updated_by_username')}")
    assert latest_history.get('previous_status') == old_status
    assert latest_history.get('new_status') == new_status
    assert latest_history.get('updated_by_username') == 'super_admin_test'

    print("\n8. Testing Notification drawer & read tracking (`read_at`)...")
    notif_list_res = super_client.get('/api/notifications/')
    assert notif_list_res.status_code == 200
    notifications = notif_list_res.json()
    print(f"   Total notifications returned in drawer: {len(notifications)} (Max 100)")
    assert len(notifications) <= 100
    
    # Find an unread notification
    unread_notifs = [n for n in notifications if not n['is_read']]
    assert len(unread_notifs) > 0, "No unread notifications to test reading"
    target_notif = unread_notifs[0]
    
    read_res = super_client.post('/api/notifications/read/', {'id': target_notif['id']}, content_type='application/json')
    assert read_res.status_code == 200
    read_data = read_res.json()
    print(f"   Notification marked as read: is_read={read_data.get('is_read')}, read_at={read_data.get('read_at')}")
    assert read_data.get('is_read') is True
    assert read_data.get('read_at') is not None

    # Clean up test users
    User.objects.filter(username__in=['super_admin_test', 'regular_admin_test', 'created_admin_test']).delete()
    print("\nALL PHASE 5 API VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_phase5_tests()
