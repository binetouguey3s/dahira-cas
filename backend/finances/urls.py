from rest_framework.routers import DefaultRouter

from django.urls import path

from .views import CotisationViewSet, EnvoyerRappelsView, RappelsView, TachesQuotidiennesView

router = DefaultRouter()
router.register("cotisations", CotisationViewSet, basename="cotisation")

urlpatterns = [
    path("rappels/", RappelsView.as_view(), name="rappels"),
    path("rappels/envoyer/", EnvoyerRappelsView.as_view(), name="rappels-envoyer"),
    path("taches/", TachesQuotidiennesView.as_view(), name="taches-quotidiennes"),
    *router.urls,
]
