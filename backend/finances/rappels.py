"""Cotisations mensuelles automatiques et rappels par e-mail."""

import logging
import threading
from collections import defaultdict
from datetime import date

from django.conf import settings
from django.db.models import Q
from django.db import close_old_connections
from django.utils import timezone

from comptes.emails import envoyer_rappel_cotisation
from comptes.models import Membre

from .models import Cotisation, ReglagesRappels

logger = logging.getLogger(__name__)
IMPAYEES = (Cotisation.Statut.NON_PAYE, Cotisation.Statut.EN_RETARD)


def generer_mois(mois, annee, montant):
    """Crée la cotisation « non payée » du mois pour chaque membre actif qui n'en a pas encore."""
    deja = set(Cotisation.objects.filter(mois=mois, annee=annee).values_list("membre_id", flat=True))
    nouvelles = [
        Cotisation(membre_id=mid, mois=mois, annee=annee, montant=montant)
        for mid in Membre.objects.filter(is_active=True).values_list("id", flat=True)
        if mid not in deja
    ]
    Cotisation.objects.bulk_create(nouvelles)
    return len(nouvelles), len(deja)


def marquer_retards(aujourdhui):
    """Les mois passés encore « non payés » passent « en retard »."""
    passe = Q(annee__lt=aujourdhui.year) | Q(annee=aujourdhui.year, mois__lt=aujourdhui.month)
    return Cotisation.objects.filter(passe, statut=Cotisation.Statut.NON_PAYE, archive_le__isnull=True).update(statut=Cotisation.Statut.EN_RETARD)


def impayees_par_membre():
    par_membre = defaultdict(list)
    qs = (
        Cotisation.objects.filter(statut__in=IMPAYEES, membre__is_active=True, archive_le__isnull=True)
        .select_related("membre")
        .order_by("annee", "mois")
    )
    for c in qs:
        par_membre[c.membre].append(c)
    return par_membre


def apercu():
    par_membre = impayees_par_membre()
    avec_email = sum(1 for m in par_membre if m.email)
    return {"concernes": len(par_membre), "avec_email": avec_email, "sans_email": len(par_membre) - avec_email}


def envoyer_rappels():
    """Envoie un rappel à chaque membre (avec e-mail) qui a des cotisations impayées."""
    from site_web.models import Parametres

    parametres = Parametres.charger()
    destinataires = [(m, cs) for m, cs in impayees_par_membre().items() if m.email]

    def tache():
        for membre, cotisations in destinataires:
            try:
                envoyer_rappel_cotisation(membre, cotisations, parametres, en_arriere_plan=False)
            except Exception:  # noqa: BLE001
                logger.exception("Rappel impossible pour le membre %s", membre.pk)

    # Un envoi par membre, à la suite, en arrière-plan : la page répond tout de suite.
    if settings.EMAIL_EN_ARRIERE_PLAN:
        threading.Thread(target=tache, daemon=True).start()
    else:
        tache()
    return len(destinataires)


def taches_quotidiennes(aujourdhui=None):
    """Appelée chaque jour par le robot GitHub : sans effet si elle est appelée plusieurs fois le même jour."""
    from site_web.models import Parametres

    aujourdhui = aujourdhui or timezone.localdate()
    resultat = {"date": aujourdhui.isoformat()}
    resultat["cotisations_creees"], _ = generer_mois(
        aujourdhui.month, aujourdhui.year, Parametres.charger().montant_cotisation
    )
    resultat["passees_en_retard"] = marquer_retards(aujourdhui)

    reglages = ReglagesRappels.charger()
    deja_ce_mois = reglages.dernier_envoi_auto and (
        (reglages.dernier_envoi_auto.year, reglages.dernier_envoi_auto.month) == (aujourdhui.year, aujourdhui.month)
    )
    if reglages.actifs and aujourdhui.day >= reglages.jour_envoi and not deja_ce_mois:
        resultat["rappels_envoyes"] = envoyer_rappels()
        reglages.dernier_envoi_auto = aujourdhui
        reglages.save(update_fields=["dernier_envoi_auto"])
    else:
        resultat["rappels_envoyes"] = 0

    # Annonces d'événements restées en attente (quota du jour atteint la veille).
    from evenements.annonces import continuer_annonces

    if settings.EMAIL_EN_ARRIERE_PLAN:  # en production : la réponse au robot part tout de suite
        def tache():
            try:
                continuer_annonces()
            finally:
                close_old_connections()

        threading.Thread(target=tache, daemon=True).start()
        resultat["annonces"] = "en_cours"
    else:
        resultat["annonces_envoyees"] = continuer_annonces()
    return resultat


def prochain_envoi(reglages, aujourdhui=None):
    if not reglages.actifs:
        return None
    aujourdhui = aujourdhui or timezone.localdate()
    deja = reglages.dernier_envoi_auto and (
        (reglages.dernier_envoi_auto.year, reglages.dernier_envoi_auto.month) == (aujourdhui.year, aujourdhui.month)
    )
    if not deja and aujourdhui.day <= reglages.jour_envoi:
        return date(aujourdhui.year, aujourdhui.month, reglages.jour_envoi)
    if not deja:
        return aujourdhui
    annee, mois = (aujourdhui.year + 1, 1) if aujourdhui.month == 12 else (aujourdhui.year, aujourdhui.month + 1)
    return date(annee, mois, reglages.jour_envoi)
