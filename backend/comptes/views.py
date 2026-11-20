import secrets

from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import generics, mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from dahira_backend.stockage import supprimer_fichier

from .models import Membre
from .emails import envoyer_bienvenue, envoyer_reinitialisation
from .permissions import ROLES_ADMIN_GENERAL, ROLES_EVENEMENTS, ROLES_FINANCE, a_un_role, role_requis
from .telephone import identifiants_possibles, normaliser_telephone
from .serializers import (
    CarteVerificationSerializer,
    ChangerMotDePasseSerializer,
    InscriptionSerializer,
    MembreAdminSerializer,
    MembreResumeSerializer,
    MembreSerializer,
    MotDePasseOublieSerializer,
    ReinitialiserMotDePasseSerializer,
)


class ConnexionView(TokenObtainPairView):
    """POST /api/comptes/connexion/ — le numéro peut être saisi avec ou sans indicatif.

    Limité à 10 tentatives par minute et par adresse IP (protection contre les essais de mots de passe).
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "connexion"

    def post(self, request, *args, **kwargs):
        identifiant = str(request.data.get("username", "")).strip()
        mot_de_passe = request.data.get("password", "")
        # Un même numéro peut être enregistré sous plusieurs formes (+221771234567, 771234567…) :
        # on essaie chaque compte correspondant et on garde celui dont le mot de passe est bon.
        for candidat in identifiants_possibles(identifiant):
            membre = Membre.objects.filter(username=candidat, is_active=True).first()
            if membre and membre.check_password(mot_de_passe):
                serializer = self.get_serializer(data={"username": candidat, "password": mot_de_passe})
                serializer.is_valid(raise_exception=True)
                return Response(serializer.validated_data)
        return super().post(request, *args, **kwargs)


class InscriptionView(generics.CreateAPIView):
    """POST /api/comptes/inscription/ — crée un membre et renvoie ses jetons JWT."""

    queryset = Membre.objects.all()
    serializer_class = InscriptionSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "inscription"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membre = serializer.save()
        envoyer_bienvenue(membre)
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
    """/api/comptes/annuaire/ — liste légère des membres (Finance, Admin contenus pour choisir les
    responsables de bus, Admin général)."""

    serializer_class = MembreResumeSerializer
    permission_classes = [role_requis(*ROLES_FINANCE, *ROLES_EVENEMENTS)]
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


class MotDePasseOublieView(APIView):
    """POST /api/comptes/mot-de-passe/oublie/ — {identifiant : téléphone ou e-mail}.

    Envoie un lien de réinitialisation à l'e-mail du compte. La réponse est toujours la même,
    que le compte existe ou non : impossible de s'en servir pour deviner qui est inscrit.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "mot_de_passe_oublie"

    def post(self, request):
        serializer = MotDePasseOublieSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifiant = serializer.validated_data["identifiant"].strip()
        actifs = Membre.objects.filter(is_active=True).exclude(email="")
        if "@" in identifiant:
            membres = actifs.filter(email__iexact=identifiant)
        else:
            numero = normaliser_telephone(identifiant)
            membres = actifs.filter(Q(username=identifiant) | Q(username=numero or identifiant))
        for membre in membres[:5]:
            envoyer_reinitialisation(membre)
        return Response({"detail": "envoye"})


class ReinitialiserMotDePasseView(APIView):
    """POST /api/comptes/mot-de-passe/reinitialiser/ — {uid, jeton, nouveau}. Lien valable 2 h, une seule fois."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "connexion"

    def post(self, request):
        serializer = ReinitialiserMotDePasseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        try:
            membre = Membre.objects.get(pk=force_str(urlsafe_base64_decode(donnees["uid"])), is_active=True)
        except (Membre.DoesNotExist, ValueError, TypeError, OverflowError):
            membre = None
        if not membre or not default_token_generator.check_token(membre, donnees["jeton"]):
            return Response({"detail": "Ce lien n'est plus valable. Refaites une demande."}, status=400)
        try:
            validate_password(donnees["nouveau"], membre)
        except ValidationError as erreurs:
            return Response({"nouveau": list(erreurs.messages)}, status=400)
        membre.set_password(donnees["nouveau"])
        membre.save(update_fields=["password"])
        return Response({"detail": "Mot de passe modifié.", "telephone": membre.telephone or membre.username})
