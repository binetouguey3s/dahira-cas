from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from comptes.permissions import ROLES_EVENEMENTS, a_un_role, role_ou_lecture_seule

from . import bus as regles
from .models import Evenement, PaiementBus, PassagerBus, ReservationBus, ResponsableBus
from .serializers import (
    EvenementSerializer,
    LigneReservationSerializer,
    PaiementBusSerializer,
    ReservationBusSerializer,
    ResponsableBusSerializer,
)


def _exiger_responsable(user, evenement):
    if not regles.est_responsable(user, evenement):
        raise PermissionDenied("Réservé aux responsables des bus de cet événement.")


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

    @action(detail=False, methods=["get"], url_path="espace-bus", permission_classes=[permissions.IsAuthenticated])
    def espace_bus(self, request):
        """Événements dont l'utilisateur gère les bus (tous pour les admins), à venir ou de la semaine passée."""
        depuis = timezone.now() - timedelta(days=7)
        qs = Evenement.objects.filter(reservation_bus_active=True, date__gte=depuis)
        if not a_un_role(request.user, ROLES_EVENEMENTS):
            qs = qs.filter(responsables_bus__membre=request.user)
        donnees = []
        for ev in qs.distinct().order_by("date"):
            reservations = ev.reservations_bus.filter(annulee=False)
            donnees.append(
                {
                    "id": ev.id,
                    "titre": ev.titre,
                    "date": ev.date,
                    "lieu": ev.lieu,
                    "categorie": ev.categorie,
                    "capacite": regles.capacite(ev),
                    "places_occupees": PassagerBus.objects.filter(reservation__evenement=ev).count(),
                    "nb_reservations": reservations.count(),
                    "paiements_a_verifier": PaiementBus.objects.filter(
                        reservation__evenement=ev, statut=PaiementBus.Statut.A_VERIFIER
                    ).count(),
                    "en_attente": reservations.filter(acceptee=False).count(),
                }
            )
        return Response(donnees)

    @action(detail=True, methods=["get"], url_path="gestion-bus", permission_classes=[permissions.IsAuthenticated])
    def gestion_bus(self, request, pk=None):
        """Tout ce qu'il faut au responsable : bus et passagers, réservations, paiements, totaux."""
        evenement = self.get_object()
        _exiger_responsable(request.user, evenement)
        reservations = (
            evenement.reservations_bus.select_related("membre", "acceptee_par", "creee_par", "evenement")
            .prefetch_related("passagers", "paiements__responsable__membre", "paiements__declare_par", "paiements__traite_par")
            .order_by("annulee", "date_reservation")
        )
        lignes = LigneReservationSerializer(reservations, many=True, context={"request": request}).data
        par_resa = {r["id"]: r for r in lignes}
        bus = []
        for numero in range(1, (evenement.nb_bus or 0) + 1):
            passagers = [
                {
                    "id": p.id,
                    "nom": p.nom,
                    "est_titulaire": p.est_titulaire,
                    "reservation": p.reservation_id,
                    "titulaire_nom": par_resa[p.reservation_id]["titulaire_nom"],
                    "titulaire_telephone": par_resa[p.reservation_id]["titulaire_telephone"],
                    "statut": par_resa[p.reservation_id]["statut"],
                }
                for p in PassagerBus.objects.filter(reservation__evenement=evenement, bus_numero=numero).order_by("id")
            ]
            bus.append({"numero": numero, "places_total": evenement.places_par_bus or 0, "passagers": passagers})
        actives = [r for r in lignes if not r["annulee"]]
        total = lambda cle: sum((Decimal(str(r[cle])) for r in actives), Decimal("0"))  # noqa: E731
        du, paye = total("montant_du"), total("montant_paye")
        return Response(
            {
                "evenement": EvenementSerializer(evenement, context={"request": request}).data,
                "bus": bus,
                "reservations": lignes,
                "totaux": {
                    "capacite": regles.capacite(evenement),
                    "places_occupees": sum(len(b["passagers"]) for b in bus),
                    "montant_du": du,
                    "montant_paye": paye,
                    "montant_a_verifier": total("montant_a_verifier"),
                    "reste_a_payer": max(du - paye, Decimal("0")),
                },
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def reservations(self, request, pk=None):
        """Liste des réservations d'un événement (responsables et admins contenus)."""
        evenement = self.get_object()
        _exiger_responsable(request.user, evenement)
        resas = evenement.reservations_bus.filter(annulee=False).select_related("membre")
        return Response(LigneReservationSerializer(resas, many=True, context={"request": request}).data)


class ReservationBusViewSet(viewsets.ModelViewSet):
    """Le membre gère sa réservation ; les responsables gèrent toutes celles de leurs événements."""

    serializer_class = ReservationBusSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["evenement"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = ReservationBus.objects.select_related("membre", "evenement").prefetch_related("passagers", "paiements")
        if a_un_role(user, ROLES_EVENEMENTS):
            return qs
        return qs.filter(Q(membre=user) | Q(evenement__responsables_bus__membre=user)).distinct()

    def _verifier_acces(self, reservation):
        user = self.request.user
        if reservation.membre_id != user.pk and not regles.est_responsable(user, reservation.evenement):
            raise PermissionDenied("Ce n'est pas votre réservation.")

    def perform_update(self, serializer):
        self._verifier_acces(serializer.instance)
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Annulation. Sans paiement, la réservation est supprimée ; sinon elle est gardée « annulée »
        (trace des paiements) et ses places sont libérées."""
        reservation = self.get_object()
        self._verifier_acces(reservation)
        responsable = regles.est_responsable(request.user, reservation.evenement)
        if not responsable and not regles.modifiable_par_membre(reservation):
            raise ValidationError("Un paiement a déjà été validé : contactez un responsable pour annuler.")
        with transaction.atomic():
            if not reservation.paiements.exists():
                reservation.delete()
                return Response(status=204)
            reservation.passagers.all().delete()
            reservation.annulee = True
            reservation.annulee_le = timezone.now()
            reservation.save(update_fields=["annulee", "annulee_le"])
            reservation.paiements.filter(statut=PaiementBus.Statut.A_VERIFIER).update(
                statut=PaiementBus.Statut.REFUSE, traite_par=request.user, traite_le=timezone.now()
            )
        return Response(status=204)

    @action(detail=True, methods=["post"])
    def accepter(self, request, pk=None):
        reservation = self.get_object()
        _exiger_responsable(request.user, reservation.evenement)
        reservation.acceptee = True
        reservation.acceptee_par = request.user
        reservation.save(update_fields=["acceptee", "acceptee_par"])
        return Response(LigneReservationSerializer(reservation, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def paiements(self, request, pk=None):
        """Le membre déclare un paiement (à vérifier) ; un responsable l'enregistre directement (validé)."""
        reservation = self.get_object()
        self._verifier_acces(reservation)
        if reservation.annulee:
            raise ValidationError("Cette réservation est annulée.")
        serializer = PaiementBusSerializer(data=request.data, context={"reservation": reservation, "request": request})
        serializer.is_valid(raise_exception=True)
        responsable = regles.est_responsable(request.user, reservation.evenement)
        maintenant = timezone.now()
        serializer.save(
            reservation=reservation,
            declare_par=request.user,
            statut=PaiementBus.Statut.VALIDE if responsable else PaiementBus.Statut.A_VERIFIER,
            traite_par=request.user if responsable else None,
            traite_le=maintenant if responsable else None,
        )
        if responsable and not reservation.acceptee:
            reservation.acceptee = True
            reservation.acceptee_par = request.user
            reservation.save(update_fields=["acceptee", "acceptee_par"])
        reservation = ReservationBus.objects.get(pk=reservation.pk)  # sans le cache des paiements
        return Response(LigneReservationSerializer(reservation, context={"request": request}).data, status=201)


class PaiementBusViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Validation ou refus d'un paiement déclaré, par un responsable."""

    serializer_class = PaiementBusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaiementBus.objects.select_related("reservation__evenement")

    def _traiter(self, request, statut):
        paiement = self.get_object()
        reservation = paiement.reservation
        _exiger_responsable(request.user, reservation.evenement)
        if reservation.annulee:
            raise ValidationError("Cette réservation est annulée.")
        paiement.statut = statut
        paiement.traite_par = request.user
        paiement.traite_le = timezone.now()
        paiement.save(update_fields=["statut", "traite_par", "traite_le"])
        if statut == PaiementBus.Statut.VALIDE and not reservation.acceptee:
            reservation.acceptee = True
            reservation.acceptee_par = request.user
            reservation.save(update_fields=["acceptee", "acceptee_par"])
        return Response(LigneReservationSerializer(reservation, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        return self._traiter(request, PaiementBus.Statut.VALIDE)

    @action(detail=True, methods=["post"])
    def refuser(self, request, pk=None):
        return self._traiter(request, PaiementBus.Statut.REFUSE)


class PassagerBusViewSet(mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Le responsable change un passager de bus, corrige son nom ou le retire."""

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch", "delete", "options"]

    def get_queryset(self):
        return PassagerBus.objects.select_related("reservation__evenement")

    def partial_update(self, request, *args, **kwargs):
        passager = self.get_object()
        evenement = passager.reservation.evenement
        _exiger_responsable(request.user, evenement)
        with transaction.atomic():
            Evenement.objects.select_for_update().get(pk=evenement.pk)
            if "nom" in request.data:
                nom = " ".join(str(request.data["nom"]).split())
                if len(nom) < 2:
                    raise ValidationError({"nom": "Nom trop court."})
                passager.nom = nom
            if "bus_numero" in request.data:
                try:
                    numero = int(request.data["bus_numero"])
                except (TypeError, ValueError):
                    raise ValidationError({"bus_numero": "Bus invalide."})
                if not 1 <= numero <= (evenement.nb_bus or 0):
                    raise ValidationError({"bus_numero": "Ce bus n'existe pas."})
                if numero != passager.bus_numero:
                    occupees = regles.places_occupees(evenement).get(numero, 0)
                    if occupees >= (evenement.places_par_bus or 0):
                        raise ValidationError({"bus_numero": f"Le bus {numero} est complet."})
                    passager.bus_numero = numero
            passager.save()
        return Response({"id": passager.id, "nom": passager.nom, "bus_numero": passager.bus_numero})

    def destroy(self, request, *args, **kwargs):
        passager = self.get_object()
        _exiger_responsable(request.user, passager.reservation.evenement)
        if passager.reservation.passagers.count() == 1:
            raise ValidationError("C'est la dernière place de la réservation : annulez plutôt la réservation.")
        passager.delete()
        return Response(status=204)


class ResponsableBusViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Un responsable met à jour ses propres numéros Wave / Orange Money."""

    serializer_class = ResponsableBusSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = ResponsableBus.objects.select_related("membre")
        return qs if a_un_role(user, ROLES_EVENEMENTS) else qs.filter(membre=user)
