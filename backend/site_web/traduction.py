"""Traduction automatique des textes saisis par les utilisateurs (service DeepL).

Sans clé DEEPL_API_KEY, les textes sont renvoyés tels quels : le site fonctionne,
simplement sans traduction automatique.
"""

import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

from .models import Traduction

logger = logging.getLogger(__name__)

LANGUES_DEEPL = {"fr": "FR", "en": "EN-GB", "es": "ES", "ar": "AR"}
LANGUES_SITE = tuple(LANGUES_DEEPL)


def _appeler_deepl(textes, langue):
    cle = settings.DEEPL_API_KEY
    hote = "api-free.deepl.com" if cle.endswith(":fx") else "api.deepl.com"
    corps = json.dumps({"text": textes, "target_lang": LANGUES_DEEPL[langue]}).encode("utf-8")
    requete = urllib.request.Request(
        f"https://{hote}/v2/translate",
        data=corps,
        headers={"Authorization": f"DeepL-Auth-Key {cle}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(requete, timeout=15) as reponse:
        resultats = json.loads(reponse.read())["translations"]
    return [
        # Si le texte est déjà dans la langue demandée, on garde l'original.
        source if r.get("detected_source_language", "").lower() == langue else r["text"]
        for source, r in zip(textes, resultats)
    ]


def traduire(textes, langue):
    """Traduit une liste de textes vers `langue` en utilisant la mémoire de traductions."""
    if langue not in LANGUES_DEEPL or not settings.DEEPL_API_KEY:
        return list(textes)

    empreintes = [Traduction.calculer_empreinte(t) for t in textes]
    connues = dict(
        Traduction.objects.filter(empreinte__in=empreintes, langue=langue).values_list("empreinte", "texte_traduit")
    )
    a_traduire = [(e, t) for e, t in zip(empreintes, textes) if e not in connues and t.strip()]
    # Dédoublonne en gardant l'ordre.
    a_traduire = list(dict(a_traduire).items())

    if a_traduire:
        try:
            traduits = _appeler_deepl([t for _, t in a_traduire], langue)
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as erreur:
            logger.warning("Traduction DeepL indisponible : %s", erreur)
            traduits = None
        if traduits:
            nouvelles = [
                Traduction(empreinte=e, langue=langue, texte_source=t, texte_traduit=tr)
                for (e, t), tr in zip(a_traduire, traduits)
            ]
            Traduction.objects.bulk_create(nouvelles, ignore_conflicts=True)
            connues.update({n.empreinte: n.texte_traduit for n in nouvelles})

    return [connues.get(e, t) for e, t in zip(empreintes, textes)]
