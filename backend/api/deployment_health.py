from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import connection
from django.conf import settings
from django.utils import timezone
import os

class DeploymentHealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        health_data = {
            "status": "healthy",
            "database": "ok",
            "queue": "ok",
            "storage": "ok",
            "speech": "ok",
            "version": "1.0.0",
            "deployment_timestamp": "2026-06-22T12:00:00Z"
        }
        
        # 1. Database Health Check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            health_data["database"] = "error"
            health_data["status"] = "unhealthy"

        # 2. Queue Health Check
        try:
            # Try to fetch/query the Django Q Ormq or Success table
            from django_q.models import Success
            Success.objects.first()
        except Exception:
            health_data["queue"] = "error"
            health_data["status"] = "unhealthy"

        # 3. Storage Health (Write, Read, Delete active checks)
        storage_status = "RED"
        try:
            import cloudinary
            import cloudinary.uploader
            import cloudinary.api
            cfg = cloudinary.config()
            
            # Check Cloudinary first
            if cfg.cloud_name and cfg.api_key and cfg.api_secret:
                try:
                    # Upload a small test file
                    import tempfile
                    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp:
                        tmp.write(b"cloudinary_health_check_data")
                        tmp_path = tmp.name
                    
                    # 1. Upload Test
                    upload_res = cloudinary.uploader.upload(
                        tmp_path, 
                        public_id="health_check_test_file",
                        overwrite=True,
                        resource_type="raw"
                    )
                    
                    # Clean up temp file
                    try:
                        os.remove(tmp_path)
                    except:
                        pass
                        
                    # 2. Read Test (verify secure_url exists)
                    read_url = upload_res.get("secure_url")
                    
                    if read_url:
                        # 3. Delete Test
                        delete_res = cloudinary.uploader.destroy(
                            "health_check_test_file", 
                            resource_type="raw"
                        )
                        if delete_res.get("result") == "ok":
                            storage_status = "GREEN"
                        else:
                            storage_status = "YELLOW" # Uploaded and read, but deletion failed
                    else:
                        storage_status = "YELLOW"
                except Exception as cloud_err:
                    # Cloudinary upload failed (e.g. no internet/bad credentials)
                    storage_status = "YELLOW"
            else:
                # Missing credentials
                storage_status = "YELLOW"
        except Exception:
            storage_status = "RED"

        # If storage_status is YELLOW, check if local storage works as fallback
        if storage_status == "YELLOW":
            try:
                # Test write-read-delete in local media directory
                local_media_dir = getattr(settings, 'MEDIA_ROOT', '')
                if local_media_dir and os.path.exists(local_media_dir):
                    test_file_path = os.path.join(local_media_dir, "local_storage_health_test.txt")
                    
                    # 1. Write Test
                    with open(test_file_path, "w") as f:
                        f.write("local_health_check_data")
                        
                    # 2. Read Test
                    with open(test_file_path, "r") as f:
                        data = f.read()
                        
                    # 3. Delete Test
                    os.remove(test_file_path)
                    
                    if data == "local_health_check_data":
                        # Local storage is green, but since Cloudinary is missing or failed, overall status is YELLOW
                        storage_status = "YELLOW"
                    else:
                        storage_status = "RED"
                else:
                    storage_status = "RED"
            except Exception:
                storage_status = "RED"

        health_data["storage"] = storage_status
        if storage_status == "RED":
            health_data["status"] = "unhealthy"

        # 4. Speech Health (OpenAI / Gemini Key check)
        speech_provider = getattr(settings, 'SPEECH_PROVIDER', 'OpenAI')
        openai_key = getattr(settings, 'OPENAI_API_KEY', '')
        google_key = getattr(settings, 'GOOGLE_API_KEY', '')
        
        if speech_provider == 'OpenAI':
            if not openai_key or openai_key.startswith('GEMINI_'):
                health_data["speech"] = "invalid_openai_key"
                health_data["status"] = "unhealthy"
        elif speech_provider == 'Gemini':
            if not google_key:
                health_data["speech"] = "missing_google_key"
                health_data["status"] = "unhealthy"

        return Response(health_data, status=status.HTTP_200_OK)
