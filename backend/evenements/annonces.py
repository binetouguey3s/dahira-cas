"""Annonce d'un événement par e-mail aux membres.

- Un membre ne reçoit jamais deux fois l'annonce du même événement (journal EnvoiAnnonce).
- Au plus QUOTA_JOUR annonces par jour (offre gratuite Brevo : 300 e-mails / jour, il en reste pour
  les mots de passe oubliés et les rappels) ; la suite part automatiquement le lendemain avec le
  robot quotidien.
- Titre et description traduits dans la langue de chaque membre ; le lieu reste tel quel.
"""

import logging
import threading

from django.conf import settings
from django.db import close_old_connections
from django.utils import timezone

from comptes.emails import envoyer_annonce_evenement
from comptes.models import Membre

from .models import EnvoiAnnonce, Evenement

logger = logging.getLogger(__name__)

QUOTA_JOUR = 200


def destinataires(evenement):
    """Membres actifs avec e-mail, qui acceptent les annonces et ne l'ont pas encore reçue."""
    return (
        Membre.objects.filter(is_active=True, recevoir_annonces=True)
        .exclude(email="")
        .exclude(pk__in=EnvoiAnnonce.objects.filter(evenement=evenement).values("membre_id"))
        .order_by("pk")
    )


def quota_restant(aujourdhui=None):
    aujourdhui = aujourdhui or timezone.localdate()
    return max(QUOTA_JOUR - EnvoiAnnonce.objects.filter(envoye_le__date=aujourdhui).count(), 0)


def etat(evenement):
    return {
        "demandee_le": evenement.annonce_demandee_le,
        "envoyes": EnvoiAnnonce.objects.filter(evenement=evenement).count(),
        "restants": destinataires(evenement).count(),
    }


def _traductions(evenement, langues):
    from site_web.traduction import traduire

    resultat = {}
    for langue in langues:
        if langue == "fr":
            resultat[langue] = (evenement.titre, evenement.description)
            continue
        titre, description = traduire([evenement.titre, evenement.description or ""], langue)
        resultat[langue] = (titre, description)
    return resultat


def envoyer_lot(evenement, limite):
    """Envoie l'annonce à au plus `limite` membres ; renvoie le nombre d'e-mails partis."""
    membres = list(destinataires(evenement)[:limite])
    if not membres:
        return 0
    traductions = _traductions(evenement, {m.langue_preferee or "fr" for m in membres})
    envoyes = 0
    for membre in membres:
        titre, description = traductions.get(membre.langue_preferee or "fr", traductions.get("fr", (evenement.titre, "")))
        try:
            envoyer_annonce_evenement(membre, evenement, titre, description, en_arriere_plan=False)
        except Exception:  # noqa: BLE001 — un membre en échec ne bloque pas les autres
            logger.exception("Annonce impossible pour le membre %s", membre.pk)
            continue
        EnvoiAnnonce.objects.get_or_create(evenement=evenement, membre=membre)
        envoyes += 1
    return envoyes


def lancer_annonce(evenement, par):
    """Demande d'annonce (bouton de l'administration). Envoi immédiat dans la limite du quota du jour."""
    evenement.annonce_demandee_le = timezone.now()
    evenement.annonce_demandee_par = par
    evenement.save(update_fields=["annonce_demandee_le", "annonce_demandee_par"])
    total = destinataires(evenement).count()
    maintenant = min(total, quota_restant())

    def tache():
        try:
            envoyer_lot(evenement, maintenant)
        finally:
            close_old_connections()

    if maintenant:
        if settings.EMAIL_EN_ARRIERE_PLAN:
            threading.Thread(target=tache, daemon=True).start()
        else:
            envoyer_lot(evenement, maintenant)
    return {"destinataires": total, "envoi_immediat": maintenant, "reportes": total - maintenant}


def continuer_annonces():
    """Appelée par le robot quotidien : termine les annonces en attente (événements à venir)."""
    total = 0
    a_venir = Evenement.objects.filter(
        annonce_demandee_le__isnull=False, date__gte=timezone.now(), archive_le__isnull=True
    ).order_by("date")
    for evenement in a_venir:
        restant = quota_restant()
        if not restant:
            break
        total += envoyer_lot(evenement, restant)
    return total
