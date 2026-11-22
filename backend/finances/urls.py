from rest_framework.routers import DefaultRouter

from django.urls import path

from .views import (
    CotisationViewSet,
    EnvoyerRappelsView,
    ExportExcelView,
    MembreSansCompteViewSet,
    RappelsView,
    TachesQuotidiennesView,
)

router = DefaultRouter()
router.register("cotisations", CotisationViewSet, basename="cotisation")
router.register("membres-sans-compte", MembreSansCompteViewSet, basename="membre-sans-compte")

urlpatterns = [
    path("rappels/", RappelsView.as_view(), name="rappels"),
    path("rappels/envoyer/", EnvoyerRappelsView.as_view(), name="rappels-envoyer"),
    path("taches/", TachesQuotidiennesView.as_view(), name="taches-quotidiennes"),
    path("export/", ExportExcelView.as_view(), name="export-excel"),
    *router.urls,
]
