"""
Django settings for dahira_backend project.
"""

import sys
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Sécurité -----------------------------------------------------------
SECRET_KEY = config("SECRET_KEY", default="django-insecure-change-me-in-production")
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# --- Sécurité HTTPS en production (Render) -------------------------------
# Render termine le HTTPS puis transmet la requête en HTTP à Django :
# cet en-tête permet à Django de savoir que la requête d'origine était sécurisée
# (sinon la connexion à /admin/ échoue avec "CSRF verification failed").
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 an : le navigateur refuse toute connexion non chiffrée
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    CSRF_TRUSTED_ORIGINS = [
        f"https://{host}" for host in ALLOWED_HOSTS if host not in ("localhost", "127.0.0.1")
    ]

# Taille maximale d'une requête (hors fichiers) et nombre de champs : limite les abus.
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 500

# --- Applications ---------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "corsheaders",
    # Apps du projet
    "comptes",
    "finances",
    "evenements",
    "mediatheque",
    "questions_reponses",
    "notifications",
    "site_web",
]

AUTH_USER_MODEL = "comptes.Membre"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "dahira_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "dahira_backend.wsgi.application"

# --- Base de données --------------------------------------------------
# Par défaut : SQLite en local. En production, définir DATABASE_URL
# (ex. fourni automatiquement par Render) pour basculer sur PostgreSQL.
DATABASE_URL = config("DATABASE_URL", default="")
if DATABASE_URL:
    import dj_database_url

    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internationalisation -----------------------------------------------
LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("fr", "Français"),
    ("en", "English"),
    ("ar", "العربية"),
]

# --- Fichiers statiques et médias ---------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Depuis Django 5.1, les backends de stockage se déclarent via STORAGES
# (STATICFILES_STORAGE et DEFAULT_FILE_STORAGE ont été supprimés).
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Cloudinary (stockage des médias : photos, audio, vidéo) — optionnel.
# Si les variables ne sont pas définies, les fichiers restent en local (MEDIA_ROOT).
CLOUDINARY_CLOUD_NAME = config("CLOUDINARY_CLOUD_NAME", default="")
CLOUDINARY_API_KEY = config("CLOUDINARY_API_KEY", default="")
CLOUDINARY_API_SECRET = config("CLOUDINARY_API_SECRET", default="")
if CLOUDINARY_CLOUD_NAME:
    INSTALLED_APPS += ["cloudinary_storage", "cloudinary"]
    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": CLOUDINARY_CLOUD_NAME,
        "API_KEY": CLOUDINARY_API_KEY,
        "API_SECRET": CLOUDINARY_API_SECRET,
    }
    STORAGES["default"] = {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Django REST Framework + JWT ----------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "dahira_backend.erreurs.gestionnaire_erreurs",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/minute",
        "user": "600/minute",
        "traduction": "120/minute",
        "connexion": "10/minute",
        "inscription": "20/hour",
        "mot_de_passe_oublie": "5/hour",
    },
}

# Journaux visibles dans l'onglet « Logs » de Render (erreurs serveur comprises).
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}

# Traduction automatique des textes saisis (DeepL). Laisser vide pour désactiver.
DEEPL_API_KEY = config("DEEPL_API_KEY", default="")

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
}

# --- CORS -----------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# --- E-mails (Brevo) -----------------------------------------------------
# Avec BREVO_API_KEY, les e-mails partent par l'API de Brevo ; sinon ils s'affichent dans la console.
# Espaces et guillemets copiés par erreur autour de la clé : retirés.
BREVO_API_KEY = config("BREVO_API_KEY", default="").strip().strip("'\"").strip()
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="dahira_backend.email_brevo.BrevoEmailBackend"
    if BREVO_API_KEY
    else "django.core.mail.backends.console.EmailBackend",
)
# Adresse d'expédition : doit être validée dans Brevo (Expéditeurs & IP > Expéditeurs).
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="no-reply@dahira-cas.local")
EMAIL_NOM_EXPEDITEUR = config("EMAIL_NOM_EXPEDITEUR", default="Dahira Cheikh Abdoulahi Seye")
# Les e-mails partent en arrière-plan (la page répond tout de suite) ; synchrone pendant les tests.
EMAIL_EN_ARRIERE_PLAN = "test" not in sys.argv

# Adresse du site (liens dans les e-mails). Par défaut : la première origine HTTPS autorisée.
FRONTEND_URL = config(
    "FRONTEND_URL",
    default=next((o for o in CORS_ALLOWED_ORIGINS if o.startswith("https://")), "http://localhost:5173"),
).rstrip("/")
# Clé secrète du robot qui lance les tâches quotidiennes (cotisations du mois, rappels).
TACHES_CLE = config("TACHES_CLE", default="")

# Validité du lien « mot de passe oublié » : 2 heures.
PASSWORD_RESET_TIMEOUT = 2 * 60 * 60

# --- n8n (webhooks sortants pour les automatisations) ---------------------
N8N_WEBHOOK_URL = config("N8N_WEBHOOK_URL", default="")
