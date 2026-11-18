from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from comptes.permissions import ROLES_FINANCE, a_un_role

from .models import Cotisation
from .serializers import CotisationSerializer


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
    ordering_fields = ["annee", "mois", "montant", "statut", "date_paiement"]

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
