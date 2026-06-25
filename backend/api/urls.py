from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import (
    ProjectViewSet, 
    ComplaintViewSet,
    CSRFTokenView,
    AdminLoginView,
    AdminCheckAuthView,
    AdminLogoutView,
    DashboardSummaryView,
    DashboardAnalyticsView,
    DashboardExportView,
    NotificationListView,
    NotificationReadView,
    UserListView,
    UserCreateView,
    UserPasswordResetView,
    UserToggleActiveView,
    ActivityLogView,
    StatusHistoryView,
    MasterProjectView,
    MasterProjectDetailView,
    MasterLocationView,
    MasterLocationDetailView,
    MasterCategoryView,
    MasterCategoryDetailView,
    MasterLanguageView,
    MasterLanguageDetailView,
    MasterBusinessUnitView,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'complaints', ComplaintViewSet, basename='complaint')

from api.deployment_health import DeploymentHealthView
from api.views_monitoring import DashboardDiagnosticsView

urlpatterns = [
    path('health/', DeploymentHealthView.as_view(), name='deployment-health'),
    path('admin/csrf/', CSRFTokenView.as_view(), name='admin-csrf'),
    path('admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('admin/check-auth/', AdminCheckAuthView.as_view(), name='admin-check-auth'),
    path('admin/logout/', AdminLogoutView.as_view(), name='admin-logout'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('dashboard/analytics/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('dashboard/diagnostics/', DashboardDiagnosticsView.as_view(), name='dashboard-diagnostics'),
    path('dashboard/export/', DashboardExportView.as_view(), name='dashboard-export'),
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/read/', NotificationReadView.as_view(), name='notification-read'),
    path('user-management/', UserListView.as_view(), name='user-list'),
    path('user-management/create/', UserCreateView.as_view(), name='user-create'),
    path('user-management/reset-password/', UserPasswordResetView.as_view(), name='user-reset-password'),
    path('user-management/disable/', UserToggleActiveView.as_view(), name='user-toggle-active'),
    path('activity-log/', ActivityLogView.as_view(), name='activity-log'),
    path('status-history/', StatusHistoryView.as_view(), name='status-history'),
    path('master/projects/', MasterProjectView.as_view(), name='master-projects'),
    path('master/projects/<int:pk>/', MasterProjectDetailView.as_view(), name='master-project-detail'),
    path('master/locations/', MasterLocationView.as_view(), name='master-locations'),
    path('master/locations/<int:pk>/', MasterLocationDetailView.as_view(), name='master-location-detail'),
    path('master/categories/', MasterCategoryView.as_view(), name='master-categories'),
    path('master/categories/<int:pk>/', MasterCategoryDetailView.as_view(), name='master-category-detail'),
    path('master/languages/', MasterLanguageView.as_view(), name='master-languages'),
    path('master/languages/<int:pk>/', MasterLanguageDetailView.as_view(), name='master-language-detail'),
    path('master/business-units/', MasterBusinessUnitView.as_view(), name='master-business-units'),
    path('', include(router.urls)),
]
