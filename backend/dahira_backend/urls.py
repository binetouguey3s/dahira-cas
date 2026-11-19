from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def sante(_request):
    """GET /api/sante/ — garde le serveur éveillé (service de « ping »). Ne touche jamais la base de
    données : la base Neon peut ainsi se mettre en veille et ne consomme pas son quota gratuit."""
    return JsonResponse({"ok": True})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/sante/", sante, name="sante"),
    path("api/comptes/", include("comptes.urls")),
    path("api/finances/", include("finances.urls")),
    path("api/evenements/", include("evenements.urls")),
    path("api/mediatheque/", include("mediatheque.urls")),
    path("api/questions-reponses/", include("questions_reponses.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/site/", include("site_web.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
