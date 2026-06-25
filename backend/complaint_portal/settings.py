"""
Django settings for complaint_portal project.
"""

from pathlib import Path
import environ
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables loading
env = environ.Env(
    # set casting and default values
    DEBUG=(bool, True),
    SECRET_KEY=(str, 'django-insecure-@$3m3a3ut&^(4=*_5ux-izubh#t@@3$7fj5=ypk-3n1680!w8('),
)

# Read .env file if it exists
env_file_path = BASE_DIR / '.env'
if env_file_path.exists():
    environ.Env.read_env(env_file_path)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party packages
    'rest_framework',
    'corsheaders',
    'django_q',
    
    # Internal apps
    'api.apps.ApiConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    
    # CORS middleware must be placed before CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.APIObservabilityMiddleware',
]

ROOT_URLCONF = 'complaint_portal.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'complaint_portal.wsgi.application'


# Database Configuration
# Uses DATABASE_URL if present (PostgreSQL), otherwise falls back to SQLite3 locally.
DATABASE_URL = env.str('DATABASE_URL', default='')
if DATABASE_URL:
    DATABASES = {
        'default': env.db()
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'api.password_validators.ComplexityValidator',
    },
]

# Security and Hardening Settings
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=False)
SESSION_COOKIE_SECURE = env.bool('SESSION_COOKIE_SECURE', default=False)
CSRF_COOKIE_SECURE = env.bool('CSRF_COOKIE_SECURE', default=False)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HSTS Settings
SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Session settings
SESSION_COOKIE_AGE = 1800
SESSION_SAVE_EVERY_REQUEST = True


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# CORS & CSRF Settings
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['Content-Disposition']

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])

if CORS_ALLOWED_ORIGINS:
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOW_ALL_ORIGINS = True

CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'


# Django REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
}

# Django-Q Cluster Settings (ORM Broker for SQLite local dev)
Q_CLUSTER = {
    'name': 'complaint_tasks',
    'workers': 2,
    'recycle': 500,
    'timeout': 60,
    'orm': 'default',
}

# Structured Logging Config
LOGS_DIR = BASE_DIR / 'logs'
os.makedirs(LOGS_DIR, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        },
    },
    'handlers': {
        'api_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOGS_DIR, 'api.log'),
            'formatter': 'standard',
        },
        'speech_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOGS_DIR, 'speech.log'),
            'formatter': 'standard',
        },
        'security_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOGS_DIR, 'security.log'),
            'formatter': 'standard',
        },
        'system_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOGS_DIR, 'system.log'),
            'formatter': 'standard',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'loggers': {
        'api': {
            'handlers': ['api_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'speech': {
            'handlers': ['speech_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django': {
            'handlers': ['system_file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
# OpenAI Model Configuration
OPENAI_STT_MODEL = env('OPENAI_STT_MODEL', default='gpt-4o-mini-transcribe')
OPENAI_TRANSLATION_MODEL = env('OPENAI_TRANSLATION_MODEL', default='gpt-4o-mini')

# Gemini Model Configuration
GEMINI_STT_MODEL = env('GEMINI_STT_MODEL', default='gemini-3-flash-preview')
GEMINI_TRANSLATION_MODEL = env('GEMINI_TRANSLATION_MODEL', default='gemini-3-flash-preview')


# Separate API Keys and Providers
raw_openai_key = env('OPENAI_API_KEY', default='')
raw_google_key = env('GOOGLE_API_KEY', default='')

OPENAI_API_KEY = raw_openai_key
GOOGLE_API_KEY = raw_google_key

# Extract google key if OpenAI API Key contains a Gemini/Google key
if OPENAI_API_KEY.startswith('GEMINI_API_KEY='):
    extracted_google_key = OPENAI_API_KEY.split('GEMINI_API_KEY=')[1].strip()
    if not GOOGLE_API_KEY:
        GOOGLE_API_KEY = extracted_google_key
    OPENAI_API_KEY = ''
elif OPENAI_API_KEY.startswith('AIzaSy'):
    if not GOOGLE_API_KEY:
        GOOGLE_API_KEY = OPENAI_API_KEY
    OPENAI_API_KEY = ''

if GOOGLE_API_KEY.startswith('GEMINI_API_KEY='):
    GOOGLE_API_KEY = GOOGLE_API_KEY.split('GEMINI_API_KEY=')[1].strip()

# Update OS environment variables so that external libraries can access the corrected keys
os.environ['OPENAI_API_KEY'] = OPENAI_API_KEY
os.environ['GOOGLE_API_KEY'] = GOOGLE_API_KEY
os.environ['GEMINI_API_KEY'] = GOOGLE_API_KEY

SPEECH_PROVIDER = env('SPEECH_PROVIDER', default='OpenAI')
TRANSLATION_PROVIDER = env('TRANSLATION_PROVIDER', default='OpenAI')

# Align provider selection with available keys
if GOOGLE_API_KEY and not OPENAI_API_KEY:
    SPEECH_PROVIDER = 'Gemini'
    TRANSLATION_PROVIDER = 'Gemini'
elif OPENAI_API_KEY and not GOOGLE_API_KEY:
    SPEECH_PROVIDER = 'OpenAI'
    TRANSLATION_PROVIDER = 'OpenAI'

# TESTING mode determination
import sys
TESTING = (
    'test' in sys.argv or 
    any('verify_' in arg for arg in sys.argv) or 
    (SPEECH_PROVIDER == 'OpenAI' and not OPENAI_API_KEY) or
    (SPEECH_PROVIDER == 'Gemini' and not GOOGLE_API_KEY) or
    (not OPENAI_API_KEY and not GOOGLE_API_KEY)
)



