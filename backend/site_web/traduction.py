"""Traduction automatique des textes saisis par les utilisateurs (service DeepL).

Sans clé DEEPL_API_KEY, les textes sont renvoyés tels quels : le site fonctionne,
simplement sans traduction automatique.
"""

import html
import json
import logging
import re
import urllib.error
import urllib.request

from django.conf import settings

from .models import Traduction

logger = logging.getLogger(__name__)

LANGUES_DEEPL = {"fr": "FR", "en": "EN-GB", "es": "ES", "ar": "AR"}
LANGUES_SITE = tuple(LANGUES_DEEPL)

# Termes religieux et noms propres à ne jamais traduire (DeepL transformait par exemple
# « Magal de Touba » en « The great mausoleum of Touba »). Variantes d'orthographe acceptées.
# Pour l'arabe, la forme arabe usuelle est écrite à la place (sinon le terme reste tel quel).
TERMES_PROTEGES = [
    (r"Grand\s+Magal\s+de\s+Touba", "الماغال الكبير في طوبى"),
    (r"Magal\s+de\s+Touba", "ماغال طوبى"),
    (r"Cheikh\s+Abdoula(?:h)?[iy]e?\s+Seye?", "الشيخ عبد الله سي"),
    (r"Cheikh\s+Ahmadou\s+Bamba(?:\s+Mback[ée])?", "الشيخ أحمدو بمبا"),
    (r"Serigne\s+Touba", "سرين طوبى"),
    (r"Nisf?ou?\s*(?:Sh|Ch|S)a+'?b+a+n+e?", "ليلة النصف من شعبان"),
    (r"L[ae][iy]?l[ae]?t(?:ou|u)l?\s*(?:Kh|Q|K)a?dr", "ليلة القدر"),
    (r"Maou?loud(?:\s+Nabi)?", "المولد النبوي"),
    (r"Tamkharit", "عاشوراء"),
    (r"Tabaski", "عيد الأضحى"),
    (r"Korit[ée]", "عيد الفطر"),
    (r"Kazu\s+Rajab", None),
    (r"Magal", "ماغال"),
    (r"Gamou", "غامو"),
    (r"Dahira", "الدائرة"),
    (r"Khidma", "الخدمة"),
    (r"Touba", "طوبى"),
    (r"Tivaouane", "تيواون"),
    (r"Mback[ée]", None),
    (r"Mouridisme", "الطريقة المريدية"),
    (r"Mouride?s?", None),
    (r"Kh?assa[ïi]d(?:e|a)s?", "القصائد"),
    (r"Xassida", "القصائد"),
    (r"Wolofal", None),
    (r"Wird", "الورد"),
    (r"Sikar", "الذكر"),
    (r"Thiant", None),
    (r"Serigne", "سرين"),
    (r"Cheikh", "الشيخ"),
    (r"Oustaz", "الأستاذ"),
    (r"Setaan[ée],?\s*Gn[ée]taan[ée]", None),
    (r"Dalal\s+ak\s+Diam", None),
]
_TERMES = [(re.compile(motif, re.IGNORECASE), arabe) for motif, arabe in TERMES_PROTEGES]
_MOTIF_PROTEGE = re.compile(r"\b(?:" + "|".join(m for m, _ in TERMES_PROTEGES) + r")\b", re.IGNORECASE)
# Changer cette version invalide les traductions déjà mémorisées (nouvelle règle de traduction).
VERSION_TRADUCTION = "v3"


def _forme_arabe(terme):
    for motif, arabe in _TERMES:
        if motif.fullmatch(terme):
            return arabe
    return None


def proteger(texte, langue=None):
    """Échappe le texte en XML et entoure les termes protégés d'une balise ignorée par DeepL.

    Vers l'arabe, un terme qui a une forme arabe usuelle est écrit directement en arabe :
    DeepL l'intègre alors naturellement à la phrase.
    """
    morceaux, position = [], 0
    for trouve in _MOTIF_PROTEGE.finditer(texte):
        morceaux.append(html.escape(texte[position : trouve.start()], quote=False))
        arabe = _forme_arabe(trouve.group(0)) if langue == "ar" else None
        morceaux.append(arabe if arabe else f"<x>{html.escape(trouve.group(0), quote=False)}</x>")
        position = trouve.end()
    morceaux.append(html.escape(texte[position:], quote=False))
    return "".join(morceaux)


def deproteger(texte):
    return html.unescape(re.sub(r"</?x>", "", texte))


def _appeler_deepl(textes, langue):
    cle = settings.DEEPL_API_KEY
    hote = "api-free.deepl.com" if cle.endswith(":fx") else "api.deepl.com"
    corps = json.dumps(
        {
            "text": [proteger(t, langue) for t in textes],
            "target_lang": LANGUES_DEEPL[langue],
            "tag_handling": "xml",
            "ignore_tags": ["x"],
        }
    ).encode("utf-8")
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
        source if r.get("detected_source_language", "").lower() == langue else deproteger(r["text"])
        for source, r in zip(textes, resultats)
    ]


def traduire(textes, langue):
    """Traduit une liste de textes vers `langue` en utilisant la mémoire de traductions."""
    if langue not in LANGUES_DEEPL or not settings.DEEPL_API_KEY:
        return list(textes)

    empreintes = [Traduction.calculer_empreinte(f"{VERSION_TRADUCTION}:{t}") for t in textes]
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
