from django.db import IntegrityError
from django.db.models import F
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from comptes.permissions import ROLES_CONTENUS, role_ou_lecture_seule

from dahira_backend.archives import ArchivesMixin
from dahira_backend.stockage import supprimer_fichier
from .models import ContenuMedia, Like
from .serializers import ContenuMediaSerializer


class ContenuMediaViewSet(ArchivesMixin, viewsets.ModelViewSet):
    """Lecture ouverte à tous ; publication réservée à l'Oustaz et aux admins contenus."""

    queryset = ContenuMedia.objects.select_related("evenement").all()
    serializer_class = ContenuMediaSerializer
    permission_classes = [role_ou_lecture_seule(*ROLES_CONTENUS)]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ["type", "evenement", "auteur", "categorie", "sur_biographie"]
    search_fields = ["titre", "description", "auteur", "categorie_autre"]
    ordering_fields = ["date_publication", "nb_likes", "nb_telechargements", "titre"]
    roles_archives = ROLES_CONTENUS

    def get_queryset(self):
        return self.filtrer_archives(super().get_queryset())

    def supprimer_definitivement(self, instance):
        supprimer_fichier(instance.fichier)
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def aimer(self, request, pk=None):
        """POST /api/mediatheque/contenus/{id}/aimer/ — ajoute ou retire le like du membre."""
        contenu = self.get_object()
        like = Like.objects.filter(contenu=contenu, membre=request.user).first()
        if like:
            like.delete()
            ContenuMedia.objects.filter(pk=contenu.pk, nb_likes__gt=0).update(nb_likes=F("nb_likes") - 1)
            aime = False
        else:
            try:
                Like.objects.create(contenu=contenu, membre=request.user)
                ContenuMedia.objects.filter(pk=contenu.pk).update(nb_likes=F("nb_likes") + 1)
            except IntegrityError:
                pass
            aime = True
        contenu.refresh_from_db(fields=["nb_likes"])
        return Response({"nb_likes": contenu.nb_likes, "aime": aime})

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def telecharger(self, request, pk=None):
        """POST /api/mediatheque/contenus/{id}/telecharger/ — incrémente le compteur de téléchargements."""
        contenu = self.get_object()
        ContenuMedia.objects.filter(pk=contenu.pk).update(nb_telechargements=F("nb_telechargements") + 1)
        contenu.refresh_from_db(fields=["nb_telechargements"])
        return Response({"nb_telechargements": contenu.nb_telechargements})
