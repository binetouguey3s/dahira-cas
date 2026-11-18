from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from comptes.permissions import ROLES_EVENEMENTS, a_un_role, role_ou_lecture_seule

from .models import Evenement, ReservationBus
from .serializers import EvenementSerializer, ReservationBusSerializer


class EvenementViewSet(viewsets.ModelViewSet):
    """Lecture ouverte à tous ; création/modification réservée aux admins contenus."""

    queryset = Evenement.objects.all()
    serializer_class = EvenementSerializer
    permission_classes = [role_ou_lecture_seule(*ROLES_EVENEMENTS)]
    filterset_fields = ["categorie", "reservation_bus_active"]
    search_fields = ["titre", "description", "lieu"]
    ordering_fields = ["date", "titre", "cree_le"]

    def get_queryset(self):
        qs = super().get_queryset()
        periode = self.request.query_params.get("periode")
        if periode == "a_venir":
            qs = qs.filter(date__gte=timezone.now())
        elif periode == "passes":
            qs = qs.filter(date__lt=timezone.now()).order_by("-date")
        return qs

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def reservations(self, request, pk=None):
        """Liste des réservations de bus d'un événement (admins contenus)."""
        if not a_un_role(request.user, ROLES_EVENEMENTS):
            return Response({"detail": "Accès réservé."}, status=403)
        evenement = self.get_object()
        resas = evenement.reservations_bus.select_related("membre").order_by("bus_numero", "membre__nom_complet")
        return Response(ReservationBusSerializer(resas, many=True).data)


class ReservationBusViewSet(viewsets.ModelViewSet):
    """Un membre gère ses propres réservations ; les admins contenus voient tout."""

    serializer_class = ReservationBusSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["evenement", "bus_numero"]

    def get_queryset(self):
        qs = ReservationBus.objects.select_related("membre", "evenement")
        if a_un_role(self.request.user, ROLES_EVENEMENTS):
            return qs
        return qs.filter(membre=self.request.user)

    def perform_create(self, serializer):
        # Verrou pour éviter de dépasser la capacité si deux membres réservent en même temps.
        with transaction.atomic():
            Evenement.objects.select_for_update().get(pk=serializer.validated_data["evenement"].pk)
            serializer.save(membre=self.request.user)
