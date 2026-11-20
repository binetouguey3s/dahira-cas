import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from dahira_backend.archives import ArchivesMixin

from comptes.permissions import ROLES_FINANCE, a_un_role

from .models import Cotisation, ReglagesRappels
from .rappels import apercu, envoyer_rappels, generer_mois, prochain_envoi, taches_quotidiennes
from .serializers import CotisationSerializer, GenererCotisationsSerializer, ReglagesRappelsSerializer


class CotisationPermission(permissions.BasePermission):
    """Un membre peut seulement CONSULTER ses propres cotisations.

    Créer, modifier ou supprimer une cotisation (dont la marquer « payée ») est
    réservé au Responsable Finance et à l'Administrateur général.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return a_un_role(request.user, ROLES_FINANCE)


class CotisationViewSet(ArchivesMixin, viewsets.ModelViewSet):
    serializer_class = CotisationSerializer
    permission_classes = [CotisationPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["membre", "statut", "mois", "annee"]
    search_fields = ["membre__nom_complet", "membre__telephone", "membre__carte_numero"]
    ordering_fields = ["annee", "mois", "montant", "statut", "date_paiement", "membre__nom_complet"]
    roles_archives = ROLES_FINANCE

    def get_queryset(self):
        qs = self.filtrer_archives(Cotisation.objects.select_related("membre"))
        if a_un_role(self.request.user, ROLES_FINANCE):
            return qs
        return qs.filter(membre=self.request.user)

    def _date_paiement(self, serializer):
        statut = serializer.validated_data.get("statut")
        if statut == Cotisation.Statut.PAYE and not serializer.validated_data.get("date_paiement"):
            instance = getattr(serializer, "instance", None)
            if not (instance and instance.date_paiement):
                return {"date_paiement": timezone.now()}
        if statut and statut != Cotisation.Statut.PAYE:
            return {"date_paiement": None}
        return {}

    def perform_create(self, serializer):
        serializer.save(**self._date_paiement(serializer))

    def perform_update(self, serializer):
        serializer.save(**self._date_paiement(serializer))

    @action(detail=False, methods=["post"])
    def generer(self, request):
        """POST /api/finances/cotisations/generer/ — {mois, annee, montant}.

        Crée une cotisation « non payée » pour chaque membre actif qui n'en a pas
        encore pour ce mois. Les cotisations existantes ne sont pas modifiées.
        """
        serializer = GenererCotisationsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mois, annee, montant = (serializer.validated_data[k] for k in ("mois", "annee", "montant"))
        creees, existantes = generer_mois(mois, annee, montant)
        return Response({"creees": creees, "existantes": existantes}, status=201)


class RappelsView(APIView):
    """GET / PATCH /api/finances/rappels/ — réglages des rappels et nombre de membres concernés (Finance)."""

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def _reponse(self, reglages):
        prochain = prochain_envoi(reglages)
        return Response(
            {
                **ReglagesRappelsSerializer(reglages).data,
                "prochain_envoi": prochain.isoformat() if prochain else None,
                "apercu": apercu(),
                "emails_actifs": bool(settings.BREVO_API_KEY) or "console" not in settings.EMAIL_BACKEND,
            }
        )

    def get(self, request):
        if not a_un_role(request.user, ROLES_FINANCE):
            return Response({"detail": "Accès réservé."}, status=403)
        return self._reponse(ReglagesRappels.charger())

    def patch(self, request):
        if not a_un_role(request.user, ROLES_FINANCE):
            return Response({"detail": "Accès réservé."}, status=403)
        serializer = ReglagesRappelsSerializer(ReglagesRappels.charger(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return self._reponse(serializer.save())


class EnvoyerRappelsView(APIView):
    """POST /api/finances/rappels/envoyer/ — envoie les rappels maintenant (Finance).

    Bloqué 10 minutes après un envoi, pour éviter les doubles clics qui enverraient deux e-mails.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not a_un_role(request.user, ROLES_FINANCE):
            return Response({"detail": "Accès réservé."}, status=403)
        reglages = ReglagesRappels.charger()
        maintenant = timezone.now()
        if reglages.dernier_envoi_manuel and maintenant - reglages.dernier_envoi_manuel < timedelta(minutes=10):
            return Response({"detail": "Des rappels viennent d'être envoyés. Réessayez dans quelques minutes."}, status=409)
        envoyes = envoyer_rappels()
        reglages.dernier_envoi_manuel = maintenant
        reglages.save(update_fields=["dernier_envoi_manuel"])
        return Response({"envoyes": envoyes, **apercu()})


class TachesQuotidiennesView(APIView):
    """POST /api/finances/taches/ — appelée chaque jour par le robot GitHub (en-tête X-Cle-Taches).

    Crée les cotisations du mois, passe les mois impayés « en retard » et envoie les rappels au jour choisi.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        cle = settings.TACHES_CLE
        recue = request.headers.get("X-Cle-Taches", "")
        if not cle or not secrets.compare_digest(recue.encode(), cle.encode()):
            return Response({"detail": "Clé invalide."}, status=403)
        return Response(taches_quotidiennes())
