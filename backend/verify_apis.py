import os
import django

# Bootstrap Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'complaint_portal.settings')
django.setup()

from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.test import Client
from django.contrib.auth import get_user_model
from api.models import Complaint

def run_tests():
    User = get_user_model()
    client = Client()

    print("1. Creating test admin user if not exists...")
    admin_user, created = User.objects.get_or_create(username='test_admin', is_staff=True, is_superuser=True)
    if created:
        admin_user.set_password('admin123')
        admin_user.save()
        print("   Test admin created successfully.")
    else:
        print("   Test admin already exists.")

    print("\n2. Testing unauthenticated public endpoints...")
    # Check public projects
    proj_res = client.get('/api/projects/')
    print(f"   GET /api/projects/: Status {proj_res.status_code}")
    assert proj_res.status_code == 200, f"Expected 200, got {proj_res.status_code}"

    # Check complaints list (blocked)
    list_res = client.get('/api/complaints/')
    print(f"   GET /api/complaints/ (unauthenticated): Status {list_res.status_code} (Expected 401/403)")
    assert list_res.status_code in [401, 403], f"Expected 401/403, got {list_res.status_code}"

    # Check dashboard summary (blocked)
    sum_res = client.get('/api/dashboard/summary/')
    print(f"   GET /api/dashboard/summary/ (unauthenticated): Status {sum_res.status_code} (Expected 401/403)")
    assert sum_res.status_code in [401, 403], f"Expected 401/403, got {sum_res.status_code}"

    print("\n3. Testing login view...")
    # Invalid password login
    login_res = client.post('/api/admin/login/', {'username': 'test_admin', 'password': 'wrong_password'}, content_type='application/json')
    print(f"   POST /api/admin/login/ (invalid pass): Status {login_res.status_code} (Expected 400)")
    assert login_res.status_code == 400, f"Expected 400, got {login_res.status_code}"

    # Valid login
    login_res = client.post('/api/admin/login/', {'username': 'test_admin', 'password': 'admin123'}, content_type='application/json')
    print(f"   POST /api/admin/login/ (valid credentials): Status {login_res.status_code} (Expected 200)")
    assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}"

    print("\n4. Testing authenticated endpoints...")
    # Check check-auth
    check_res = client.get('/api/admin/check-auth/')
    print(f"   GET /api/admin/check-auth/: Status {check_res.status_code}, Body: {check_res.json()}")
    assert check_res.status_code == 200
    assert check_res.json().get('authenticated') is True

    # Check complaints list (should be 200 and paginated)
    list_res = client.get('/api/complaints/')
    print(f"   GET /api/complaints/ (authenticated): Status {list_res.status_code}")
    assert list_res.status_code == 200
    data = list_res.json()
    print(f"   Paginated results check: count={data.get('count')}, results_on_page={len(data.get('results', []))}")
    assert 'results' in data
    assert 'count' in data
    assert len(data['results']) <= 25, "Expected page size <= 25"

    # Check dashboard summary
    summary_res = client.get('/api/dashboard/summary/')
    print(f"   GET /api/dashboard/summary/: Status {summary_res.status_code}, Body: {summary_res.json()}")
    assert summary_res.status_code == 200
    assert 'total' in summary_res.json()

    # Check dashboard analytics
    analytics_res = client.get('/api/dashboard/analytics/')
    print(f"   GET /api/dashboard/analytics/: Status {analytics_res.status_code}")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert 'category_distribution' in analytics_data
    assert 'status_distribution' in analytics_data
    assert 'project_distribution' in analytics_data
    assert 'monthly_trend' in analytics_data

    # Check excel export
    export_res = client.get('/api/dashboard/export/')
    print(f"   GET /api/dashboard/export/: Status {export_res.status_code}, Content-Type: {export_res.get('Content-Type')}")
    assert export_res.status_code == 200
    assert export_res.get('Content-Type') == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    # Check complaint detail and status update
    complaint = Complaint.objects.first()
    if complaint:
        detail_res = client.get(f'/api/complaints/{complaint.id}/')
        print(f"   GET /api/complaints/{complaint.id}/: Status {detail_res.status_code}, Ref: {detail_res.json().get('reference_number')}")
        assert detail_res.status_code == 200
        assert 'updated_at' in detail_res.json()
        assert 'created_at' in detail_res.json()

        # Check status update
        old_status = complaint.status
        new_status = 'Completed' if old_status != 'Completed' else 'In Progress'
        patch_res = client.patch(f'/api/complaints/{complaint.id}/status/', {'status': new_status}, content_type='application/json')
        print(f"   PATCH /api/complaints/{complaint.id}/status/: Status {patch_res.status_code}, New Status: {patch_res.json().get('status')}")
        assert patch_res.status_code == 200
        assert patch_res.json().get('status') == new_status

    print("\n5. Testing logout view...")
    logout_res = client.post('/api/admin/logout/')
    print(f"   POST /api/admin/logout/: Status {logout_res.status_code}")
    assert logout_res.status_code == 200

    check_res = client.get('/api/admin/check-auth/')
    print(f"   GET /api/admin/check-auth/ after logout: Status {check_res.status_code}, Body: {check_res.json()}")
    assert check_res.json().get('authenticated') is False

    print("\nALL BACKEND API VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()
