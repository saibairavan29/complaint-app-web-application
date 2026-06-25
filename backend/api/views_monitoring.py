from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.cache import cache
from django.db.models import Avg, Count
from django.utils import timezone
from datetime import timedelta
import os

from api.models import (
    Complaint, SpeechProcessingLog, BackupLog, 
    QueueFailureLog, SystemErrorLog, SecurityEvent, UserActivity
)
from api.backup_manager import perform_database_backup, perform_media_backup, restore_database_backup

class DashboardDiagnosticsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        now = timezone.now()
        
        # 1. Filters (Today, 7 days, 30 days)
        filter_days = request.query_params.get('days', '7')
        try:
            days = int(filter_days)
        except ValueError:
            days = 7
        cutoff_date = now - timedelta(days=days)

        # --- A. API Metrics ---
        total_requests = cache.get('telemetry:total_requests', 0)
        total_duration = cache.get('telemetry:total_duration', 0.0)
        failed_requests = cache.get('telemetry:failed_requests', 0)
        endpoints = cache.get('telemetry:endpoints', {})
        
        avg_response_time = (total_duration / total_requests) if total_requests > 0 else 0.0
        
        slowest_endpoint = "None"
        max_duration = 0.0
        for ep, ep_data in endpoints.items():
            if ep_data.get('max_duration', 0.0) > max_duration:
                max_duration = ep_data['max_duration']
                slowest_endpoint = ep

        api_metrics = {
            "total_requests": total_requests,
            "avg_response_time": round(avg_response_time * 1000, 1),  # in ms
            "slowest_endpoint": slowest_endpoint,
            "failed_requests": failed_requests
        }

        # --- B. Speech Metrics ---
        speech_logs = SpeechProcessingLog.objects.all()
        total_speech = speech_logs.count()
        avg_processing_time = speech_logs.aggregate(Avg('processing_time_ms'))['processing_time_ms__avg'] or 0.0
        
        success_count = speech_logs.filter(status='COMPLETED').count()
        failed_count = speech_logs.filter(status='FAILED').count()
        retry_count = speech_logs.filter(attempt_number__gt=1).count()
        
        low_confidence_events_count = speech_logs.filter(error_message__icontains='low confidence').count()
        low_confidence_complaints_count = Complaint.objects.filter(translation_confidence__lt=0.70).count()
        
        speech_metrics = {
            "avg_processing_time": round(avg_processing_time, 1),
            "success_rate": round((success_count / total_speech * 100) if total_speech > 0 else 100.0, 1),
            "failure_rate": round((failed_count / total_speech * 100) if total_speech > 0 else 0.0, 1),
            "retry_rate": round((retry_count / total_speech * 100) if total_speech > 0 else 0.0, 1),
            "low_confidence_count": low_confidence_events_count + low_confidence_complaints_count
        }

        # --- C. Queue Metrics ---
        pending_queue = 0
        oldest_pending_age = 0
        completed_queue = 0
        failed_queue = 0
        failed_last_24h = 0
        retry_count = 0
        retry_percentage = 0.0
        processing_rate = 0.0
        avg_wait_time = 0.0
        avg_processing_time = 0.0
        throughput_per_hour = 0.0

        try:
            from django_q.models import OrmQ, Success, Failure
            pending_queue = OrmQ.objects.count()
            completed_queue = Success.objects.count()
            failed_queue = Failure.objects.count()
            
            # Oldest Pending Task Age
            if pending_queue > 0:
                oldest_pending_complaint = Complaint.objects.filter(transcription_status='PENDING').order_by('created_at').first()
                if oldest_pending_complaint:
                    oldest_pending_age = int((now - oldest_pending_complaint.created_at).total_seconds())
            
            # Failed Tasks Last 24 Hours
            failed_last_24h = Failure.objects.filter(stopped__gte=now - timedelta(days=1)).count()
            
            # Retry metrics
            from django.db.models import Sum
            success_retries = Success.objects.filter(attempt_count__gt=1).aggregate(Sum('attempt_count'))['attempt_count__sum'] or 0
            success_count_gt1 = Success.objects.filter(attempt_count__gt=1).count()
            failure_retries = Failure.objects.filter(attempt_count__gt=1).aggregate(Sum('attempt_count'))['attempt_count__sum'] or 0
            failure_count_gt1 = Failure.objects.filter(attempt_count__gt=1).count()
            
            retry_count = (success_retries - success_count_gt1) + (failure_retries - failure_count_gt1)
            total_tasks = completed_queue + failed_queue
            if total_tasks > 0:
                retry_percentage = round((retry_count / total_tasks) * 100, 1)
                
            # Queue Processing Rate (last hour)
            last_hour = now - timedelta(hours=1)
            tasks_last_hour = Success.objects.filter(stopped__gte=last_hour).count() + Failure.objects.filter(stopped__gte=last_hour).count()
            processing_rate = round(tasks_last_hour / 60.0, 2)
            
            # Average Queue Wait Time (using SpeechProcessingLog + Complaint correlation)
            logs = SpeechProcessingLog.objects.select_related('complaint').all()
            total_wait = 0.0
            wait_count = 0
            for log in logs:
                if log.complaint:
                    duration_sec = (log.processing_time_ms or 0) / 1000.0
                    elapsed = (log.created_at - log.complaint.created_at).total_seconds()
                    wait_time = max(0.0, elapsed - duration_sec)
                    total_wait += wait_time
                    wait_count += 1
            avg_wait_time = round(total_wait / wait_count, 1) if wait_count > 0 else 0.0
            
            # Average Processing Time (from Success/Failure models)
            total_proc_time = 0.0
            task_count = 0
            for t in Success.objects.all():
                if t.started and t.stopped:
                    total_proc_time += (t.stopped - t.started).total_seconds()
                    task_count += 1
            for t in Failure.objects.all():
                if t.started and t.stopped:
                    total_proc_time += (t.stopped - t.started).total_seconds()
                    task_count += 1
            avg_processing_time = round(total_proc_time / task_count, 1) if task_count > 0 else 0.0
            
            # Queue Throughput Per Hour (based on completed tasks in last 24h)
            completed_last_24 = Success.objects.filter(stopped__gte=now - timedelta(days=1)).count() + Failure.objects.filter(stopped__gte=now - timedelta(days=1)).count()
            throughput_per_hour = round(completed_last_24 / 24.0, 1)
            
        except Exception as q_err:
            pass
            
        running_queue = 0
        try:
            from django_q.status import Stat
            stats = Stat.get_all()
            for stat in stats:
                running_queue += len(stat.task_threads) if hasattr(stat, 'task_threads') else 0
        except Exception:
            pass

        queue_metrics = {
            "pending": pending_queue,
            "running": running_queue,
            "failed": failed_queue,
            "completed": completed_queue,
            "oldest_pending_age": oldest_pending_age,
            "failed_last_24h": failed_last_24h,
            "retry_count": retry_count,
            "retry_percentage": retry_percentage,
            "processing_rate": processing_rate,
            "avg_wait_time": avg_wait_time,
            "avg_processing_time": avg_processing_time,
            "throughput_per_hour": throughput_per_hour
        }

        # --- D. Error Monitoring Panel ---
        errors_query = SystemErrorLog.objects.filter(created_at__gte=cutoff_date)
        recent_errors = []
        for err in errors_query[:50]:
            recent_errors.append({
                "id": err.id,
                "error_type": err.error_type,
                "message": err.message,
                "traceback_summary": err.traceback_summary,
                "created_at": err.created_at.isoformat()
            })

        error_counts = errors_query.values('error_type').annotate(count=Count('id'))
        category_counts = {choice[0]: 0 for choice in SystemErrorLog.ERROR_TYPE_CHOICES}
        for ec in error_counts:
            category_counts[ec['error_type']] = ec['count']

        errors_panel = {
            "recent": recent_errors,
            "counts": category_counts
        }

        # --- E. Security Monitoring ---
        security_logs = SecurityEvent.objects.filter(created_at__gte=cutoff_date)
        security_list = []
        for ev in security_logs[:50]:
            security_list.append({
                "id": ev.id,
                "event_type": ev.event_type,
                "ip_address": ev.ip_address,
                "username": ev.username,
                "details": ev.details,
                "created_at": ev.created_at.isoformat()
            })

        failed_logins = SecurityEvent.objects.filter(event_type='failed_login', created_at__gte=cutoff_date).count()
        locked_accounts = SecurityEvent.objects.filter(event_type='account_lockout', created_at__gte=cutoff_date).count()
        rate_limits = SecurityEvent.objects.filter(event_type='rate_limit_exceeded', created_at__gte=cutoff_date).count()
        suspicious_activities = SecurityEvent.objects.filter(event_type='suspicious_activity', created_at__gte=cutoff_date).count()

        security_dashboard = {
            "failed_logins": failed_logins,
            "locked_accounts": locked_accounts,
            "rate_limited_requests": rate_limits,
            "suspicious_activities": suspicious_activities,
            "events": security_list
        }

        # --- F. Backup Logs ---
        backups = BackupLog.objects.all()
        backup_list = []
        for b in backups:
            backup_list.append({
                "id": b.id,
                "backup_type": b.backup_type,
                "file_name": b.file_name,
                "file_size": b.file_size,
                "status": b.status,
                "restore_tested": b.restore_tested,
                "created_at": b.created_at.isoformat()
            })

        # --- G. Queue Failure Logs ---
        queue_failures = QueueFailureLog.objects.all()
        failure_list = []
        for f in queue_failures[:50]:
            failure_list.append({
                "id": f.id,
                "complaint_id": f.complaint_id,
                "complaint_ref": f.complaint.reference_number if f.complaint else "N/A",
                "exception_message": f.exception_message,
                "traceback_summary": f.traceback_summary,
                "attempt_count": f.attempt_count,
                "failed_at": f.failed_at.isoformat()
            })

        return Response({
            "api_metrics": api_metrics,
            "speech_metrics": speech_metrics,
            "queue_metrics": queue_metrics,
            "errors": errors_panel,
            "security": security_dashboard,
            "backups": backup_list,
            "queue_failures": failure_list
        }, status=status.HTTP_200_OK)

    def post(self, request):
        action = request.data.get('action')
        
        if action == 'backup_db':
            status_val, filename, size = perform_database_backup()
            return Response({
                "success": status_val == 'SUCCESS',
                "status": status_val,
                "file_name": filename,
                "file_size": size
            }, status=status.HTTP_200_OK)
            
        elif action == 'backup_media':
            status_val, filename, size = perform_media_backup()
            return Response({
                "success": status_val == 'SUCCESS',
                "status": status_val,
                "file_name": filename,
                "file_size": size
            }, status=status.HTTP_200_OK)
            
        elif action == 'restore_db':
            filename = request.data.get('file_name')
            if not filename:
                return Response({"detail": "File name is required."}, status=status.HTTP_400_BAD_REQUEST)
            success, msg = restore_database_backup(filename)
            return Response({
                "success": success,
                "message": msg
            }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)
            
        return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)
