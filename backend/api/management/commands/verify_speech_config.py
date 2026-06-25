from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Verifies speech and translation configurations and keys'

    def handle(self, *args, **options):
        speech_provider = getattr(settings, 'SPEECH_PROVIDER', 'OpenAI')
        translation_provider = getattr(settings, 'TRANSLATION_PROVIDER', 'OpenAI')
        openai_key = getattr(settings, 'OPENAI_API_KEY', '')
        google_key = getattr(settings, 'GOOGLE_API_KEY', '')

        # Masking keys helper
        def mask_key(key):
            if not key:
                return "None"
            if len(key) > 10:
                return f"{key[:6]}...{key[-4:]}"
            return "..."

        openai_loaded = "YES" if openai_key else "NO"
        google_loaded = "YES" if google_key else "NO"

        self.stdout.write(f"Speech Provider: {speech_provider}")
        self.stdout.write(f"Translation Provider: {translation_provider}")
        self.stdout.write(f"OpenAI Key Loaded: {openai_loaded} ({mask_key(openai_key)})")
        self.stdout.write(f"Google Key Loaded: {google_loaded} ({mask_key(google_key)})")
