"""Règles de la réservation de bus : attribution automatique des places, montants et statuts."""

from collections import Counter
from decimal import Decimal

from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from comptes.permissions import ROLES_EVENEMENTS, a_un_role

from .models import PaiementBus, PassagerBus

MAX_PASSAGERS = 10


def est_responsable(user, evenement) -> bool:
    """Admin contenus / Admin général, ou membre désigné responsable des bus de cet événement."""
    if a_un_role(user, ROLES_EVENEMENTS):
        return True
    return bool(
        user and user.is_authenticated and evenement.responsables_bus.filter(membre=user).exists()
    )


def places_occupees(evenement, sauf=()) -> Counter:
    """Nombre de passagers par bus (les réservations annulées n'ont plus de passagers)."""
    qs = PassagerBus.objects.filter(reservation__evenement=evenement).exclude(pk__in=list(sauf))
    return Counter(qs.values_list("bus_numero", flat=True))


def capacite(evenement) -> int:
    return (evenement.nb_bus or 0) * (evenement.places_par_bus or 0)


def places_restantes(evenement) -> int:
    return max(capacite(evenement) - sum(places_occupees(evenement).values()), 0)


def attribuer_bus(evenement, nombre: int) -> list[int]:
    """Numéro de bus de chacune des `nombre` nouvelles places : on remplit le bus 1, puis le 2, etc.
    Un groupe peut être réparti sur deux bus. À appeler sous verrou (select_for_update sur l'événement)."""
    if not nombre:
        return []
    occupees = places_occupees(evenement)
    par_bus = evenement.places_par_bus or 0
    numeros = []
    for numero in range(1, (evenement.nb_bus or 0) + 1):
        libres = par_bus - occupees.get(numero, 0)
        while libres > 0 and len(numeros) < nombre:
            numeros.append(numero)
            libres -= 1
        if len(numeros) == nombre:
            return numeros
    restantes = len(numeros)
    if restantes == 0:
        raise ValidationError({"passagers": "Tous les bus sont complets."})
    raise ValidationError({"passagers": f"Il ne reste que {restantes} place(s) dans les bus."})


def montant_du(reservation) -> Decimal:
    prix = reservation.evenement.prix_place or Decimal("0")
    if reservation.annulee:
        return Decimal("0")
    return prix * reservation.passagers.count()


def total_paiements(reservation, statut) -> Decimal:
    return reservation.paiements.filter(statut=statut).aggregate(t=Sum("montant"))["t"] or Decimal("0")


def statut_reservation(reservation, du=None, paye=None) -> str:
    """annulee · payee · acompte · acceptee · en_attente."""
    if reservation.annulee:
        return "annulee"
    du = montant_du(reservation) if du is None else du
    paye = total_paiements(reservation, PaiementBus.Statut.VALIDE) if paye is None else paye
    if du > 0 and paye >= du:
        return "payee"
    if paye > 0:
        return "acompte"
    if reservation.acceptee:
        return "acceptee"
    return "en_attente"


def modifiable_par_membre(reservation) -> bool:
    """Le membre peut modifier ou annuler lui-même tant qu'aucun paiement n'a été validé."""
    return not reservation.annulee and not reservation.paiements.filter(statut=PaiementBus.Statut.VALIDE).exists()
