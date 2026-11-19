from dahira_backend.stockage import supprimer_fichier
import secrets

from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Membre
from .permissions import ROLES_ADMIN_GENERAL, ROLES_FINANCE, a_un_role, role_requis
from .serializers import (
    CarteVerificationSerializer,
    ChangerMotDePasseSerializer,
    InscriptionSerializer,
    MembreAdminSerializer,
    MembreResumeSerializer,
    MembreSerializer,
)


class InscriptionView(generics.CreateAPIView):
    """POST /api/comptes/inscription/ — crée un membre et renvoie ses jetons JWT."""

    queryset = Membre.objects.all()
    serializer_class = InscriptionSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membre = serializer.save()
        refresh = RefreshToken.for_user(membre)
        return Response(
            {
                "membre": MembreSerializer(membre, context={"request": request}).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=201,
        )


class MoiView(APIView):
    """GET/PATCH /api/comptes/moi/ — profil du membre connecté (photo en multipart).

    DELETE /api/comptes/moi/photo/ est géré par SupprimerPhotoView.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        return Response(MembreSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        serializer = MembreSerializer(request.user, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SupprimerPhotoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        if request.user.photo:
            supprimer_fichier(request.user.photo)
            request.user.photo = None
            request.user.save(update_fields=["photo"])
        return Response(MembreSerializer(request.user, context={"request": request}).data)


class ChangerMotDePasseView(APIView):
    """POST /api/comptes/moi/mot-de-passe/ — {ancien, nouveau}."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangerMotDePasseSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["nouveau"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Mot de passe modifié."})


class VerifierCarteView(APIView):
    """GET /api/comptes/carte/<numero>/ — public : vérifie une carte de membre (QR code)."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request, numero):
        # Une carte d'un compte désactivé n'est plus valide : elle est traitée comme inconnue.
        membre = get_object_or_404(Membre, carte_numero=numero, is_active=True)
        return Response(CarteVerificationSerializer(membre, context={"request": request}).data)


def mot_de_passe_provisoire() -> str:
    return "-".join(secrets.token_hex(2) for _ in range(3))


class MembreAdminViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """/api/comptes/membres/ — gestion des membres par l'Administrateur général."""

    serializer_class = MembreAdminSerializer
    permission_classes = [role_requis(*ROLES_ADMIN_GENERAL)]
    filterset_fields = ["role", "is_active", "pays", "langue_preferee"]
    search_fields = ["nom_complet", "telephone", "email", "carte_numero", "profession"]
    ordering_fields = ["nom_complet", "date_inscription", "role", "last_login"]
    ordering = ["-date_inscription"]

    def get_queryset(self):
        return Membre.objects.annotate(
            nb_cotisations_payees=Count("cotisations", filter=Q(cotisations__statut="paye"))
        )

    def create(self, request, *args, **kwargs):
        """Inscrit un membre à sa place (ex. sans smartphone) avec un mot de passe provisoire."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provisoire = mot_de_passe_provisoire()
        membre = serializer.save(username=serializer.validated_data["telephone"])
        membre.set_password(provisoire)
        membre.save(update_fields=["password"])
        donnees = self.get_serializer(self.get_queryset().get(pk=membre.pk)).data
        return Response({**donnees, "mot_de_passe_provisoire": provisoire}, status=201)

    @action(detail=True, methods=["post"], url_path="reinitialiser-mot-de-passe")
    def reinitialiser_mot_de_passe(self, request, pk=None):
        """Génère un mot de passe provisoire à transmettre au membre."""
        membre = self.get_object()
        provisoire = mot_de_passe_provisoire()
        membre.set_password(provisoire)
        membre.save(update_fields=["password"])
        return Response({"mot_de_passe_provisoire": provisoire})


class MembreAnnuaireView(generics.ListAPIView):
    """/api/comptes/annuaire/ — liste légère des membres pour la Finance et l'Admin général."""

    serializer_class = MembreResumeSerializer
    permission_classes = [role_requis(*ROLES_FINANCE)]
    search_fields = ["nom_complet", "telephone", "carte_numero"]
    pagination_class = None

    def get_queryset(self):
        return Membre.objects.filter(is_active=True).order_by("nom_complet")


class StatistiquesView(APIView):
    """GET /api/comptes/statistiques/ — chiffres clés du tableau de bord admin."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from evenements.models import Evenement
        from finances.models import Cotisation
        from mediatheque.models import ContenuMedia
        from questions_reponses.models import Question

        user = request.user
        maintenant = timezone.now()
        stats = {}
        if a_un_role(user, ROLES_ADMIN_GENERAL):
            stats["membres"] = Membre.objects.filter(is_active=True).count()
            stats["nouveaux_membres_mois"] = Membre.objects.filter(
                date_inscription__year=maintenant.year, date_inscription__month=maintenant.month
            ).count()
        if a_un_role(user, ROLES_FINANCE):
            du_mois = Cotisation.objects.filter(annee=maintenant.year, mois=maintenant.month)
            stats["cotisations_mois_payees"] = du_mois.filter(statut="paye").count()
            stats["cotisations_mois_total"] = du_mois.count()
            stats["montant_encaisse_annee"] = (
                Cotisation.objects.filter(annee=maintenant.year, statut="paye").aggregate(t=Sum("montant"))["t"] or 0
            )
            stats["cotisations_en_retard"] = Cotisation.objects.exclude(statut="paye").count()
        if a_un_role(user, ("oustaz", "admin_general")):
            stats["questions_en_attente"] = Question.objects.filter(statut="en_attente").count()
        if a_un_role(user, ("oustaz", "admin_contenus", "admin_general")):
            stats["contenus"] = ContenuMedia.objects.count()
        if a_un_role(user, ("admin_contenus", "admin_general")):
            stats["evenements_a_venir"] = Evenement.objects.filter(date__gte=maintenant).count()
        return Response(stats)
