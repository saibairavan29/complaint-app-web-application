from django.apps import AppConfig
import logging
import os

logger = logging.getLogger(__name__)

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Only run diagnostic checks on startup once
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('RUN_MAIN'):
            try:
                self.run_startup_validation()
            except Exception as e:
                logger.error(f"Error during startup validation: {e}")

    def run_startup_validation(self):
        from django.conf import settings
        
        speech_provider = getattr(settings, 'SPEECH_PROVIDER', 'OpenAI')
        translation_provider = getattr(settings, 'TRANSLATION_PROVIDER', 'OpenAI')
        openai_key = getattr(settings, 'OPENAI_API_KEY', '')
        google_key = getattr(settings, 'GOOGLE_API_KEY', '')
        is_testing = getattr(settings, 'TESTING', False)

        openai_loaded = "YES" if openai_key else "NO"

        # Masking function
        def mask_key(k):
            if not k:
                return "None"
            if len(k) > 10:
                return f"{k[:6]}...{k[-4:]}"
            return "..."

        # Log active providers (Mask keys)
        print(f"Speech Provider: {speech_provider}")
        print(f"Translation Provider: {translation_provider}")
        print(f"OPENAI_API_KEY Loaded: {openai_loaded}")
        
        logger.info(f"Speech Provider: {speech_provider}")
        logger.info(f"Translation Provider: {translation_provider}")
        logger.info(f"OPENAI_API_KEY Loaded: {openai_loaded}")

        # Validate configuration mismatches
        if not is_testing:
            if speech_provider == 'OpenAI' and (not openai_key or openai_key.startswith('GEMINI_')):
                raise ValueError(f"Startup Validation Error: Invalid key configured for OpenAI Speech Provider. Received key format or prefix mismatch.")
            if translation_provider == 'OpenAI' and (not openai_key or openai_key.startswith('GEMINI_')):
                raise ValueError(f"Startup Validation Error: Invalid key configured for OpenAI Translation Provider. Received key format or prefix mismatch.")
            if speech_provider == 'Gemini' and not google_key:
                raise ValueError(f"Startup Validation Error: GOOGLE_API_KEY is missing for Gemini Speech Provider.")
            if translation_provider == 'Gemini' and not google_key:
                raise ValueError(f"Startup Validation Error: GOOGLE_API_KEY is missing for Gemini Translation Provider.")


        # 1. Verify API key fallbacks (when testing or fallback is acceptable)
        if not openai_key and not google_key:
            logger.warning("Startup Validation WARNING: Neither OPENAI_API_KEY nor GOOGLE_API_KEY is configured. Speech verification will run in fallback mode.")
        
        # 2. Verify Cloudinary configuration
        cloudinary_configured = False
        try:
            import cloudinary
            cfg = cloudinary.config()
            if cfg.cloud_name and cfg.api_key and cfg.api_secret:
                cloudinary_configured = True
        except Exception:
            pass
        
        if not cloudinary_configured:
            logger.warning("Startup Validation WARNING: Cloudinary is not configured. Media storage operations might fail.")

        # 3. Verify Media paths
        media_root = getattr(settings, 'MEDIA_ROOT', '')
        if media_root:
            if not os.path.exists(media_root):
                try:
                    os.makedirs(media_root, exist_ok=True)
                except Exception as e:
                    logger.warning(f"Startup Validation WARNING: Media root does not exist and could not be created: {e}")

        # 4. Verify Backup folders exist
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        for folder in ['database', 'media']:
            path = os.path.join(backup_dir, folder)
            if not os.path.exists(path):
                try:
                    os.makedirs(path, exist_ok=True)
                except Exception as e:
                    logger.warning(f"Startup Validation WARNING: Backup directory {path} could not be created: {e}")

        # 5. Verify Queue configuration
        q_cluster = getattr(settings, 'Q_CLUSTER', None)
        if not q_cluster:
            logger.warning("Startup Validation WARNING: django-q Q_CLUSTER is not configured.")

        # 6. Verify PostgreSQL Configuration
        db_config = getattr(settings, 'DATABASES', {}).get('default', {})
        db_engine = db_config.get('ENGINE', '')
        if 'postgresql' in db_engine:
            try:
                from django.db import connections
                conn = connections['default']
                conn.ensure_connection()
            except Exception as e:
                logger.warning(f"Startup Validation WARNING: PostgreSQL connection could not be established: {e}")
        else:
            logger.info("Startup Validation INFO: Running on SQLite database engine. PostgreSQL is not active.")
