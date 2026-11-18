from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from comptes.permissions import ROLES_FINANCE, a_un_role

from comptes.models import Membre

from .models import Cotisation
from .serializers import CotisationSerializer, GenererCotisationsSerializer


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


class CotisationViewSet(viewsets.ModelViewSet):
    serializer_class = CotisationSerializer
    permission_classes = [CotisationPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["membre", "statut", "mois", "annee"]
    search_fields = ["membre__nom_complet", "membre__telephone", "membre__carte_numero"]
    ordering_fields = ["annee", "mois", "montant", "statut", "date_paiement", "membre__nom_complet"]

    def get_queryset(self):
        qs = Cotisation.objects.select_related("membre")
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
        deja = set(Cotisation.objects.filter(mois=mois, annee=annee).values_list("membre_id", flat=True))
        nouvelles = [
            Cotisation(membre_id=mid, mois=mois, annee=annee, montant=montant)
            for mid in Membre.objects.filter(is_active=True).values_list("id", flat=True)
            if mid not in deja
        ]
        Cotisation.objects.bulk_create(nouvelles)
        return Response({"creees": len(nouvelles), "existantes": len(deja)}, status=201)
