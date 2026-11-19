from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangerMotDePasseView,
    ConnexionView,
    InscriptionView,
    MembreAdminViewSet,
    MembreAnnuaireView,
    MoiView,
    StatistiquesView,
    SupprimerPhotoView,
    VerifierCarteView,
)

router = DefaultRouter()
router.register("membres", MembreAdminViewSet, basename="membre")

urlpatterns = [
    path("inscription/", InscriptionView.as_view(), name="inscription"),
    path("connexion/", ConnexionView.as_view(), name="connexion"),
    path("connexion/rafraichir/", TokenRefreshView.as_view(), name="connexion-rafraichir"),
    path("moi/", MoiView.as_view(), name="moi"),
    path("moi/photo/", SupprimerPhotoView.as_view(), name="moi-photo"),
    path("moi/mot-de-passe/", ChangerMotDePasseView.as_view(), name="moi-mot-de-passe"),
    path("carte/<str:numero>/", VerifierCarteView.as_view(), name="verifier-carte"),
    path("annuaire/", MembreAnnuaireView.as_view(), name="annuaire"),
    path("statistiques/", StatistiquesView.as_view(), name="statistiques"),
    path("", include(router.urls)),
]
