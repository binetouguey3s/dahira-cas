"""Traduction automatique des textes saisis par les utilisateurs (service DeepL).

Sans clé DEEPL_API_KEY, les textes sont renvoyés tels quels : le site fonctionne,
simplement sans traduction automatique.
"""

import functools
import hashlib
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

# Noms de lieux et adresses : « Keur Ndiaye Lo » ne doit jamais devenir « Maison Ndiaye Lo ».
# Le mot de lieu wolof est gardé avec tous les mots en majuscule qui le suivent.
_MOT_PROPRE = r"[A-ZÀ-ÖØ-ÞŊ0-9][\w'’-]*"
LIEUX = rf"(?:Keur|Kër|Ker|Darou|Daaru|Daru|Ndame|Ndiarème|Ndiareme)(?:\s+{_MOT_PROPRE})+|Kourel(?:\s+{_MOT_PROPRE})*"
# Noms et prénoms courants : reconnus seulement avec une majuscule (« Fall », pas « fall »).
NOMS_PROPRES = [
    # Noms de famille
    "Ndiaye", "Diop", "Fall", "Seye", "Sèye", "Sy", "Mbaye", "Sall", "Lo", "Ly", "Gueye", "Guèye", "Faye",
    "Diouf", "Sarr", "Ba", "Kane", "Cissé", "Cisse", "Thiam", "Niang", "Ndao", "Dieng", "Diagne", "Sow",
    "Sène", "Sene", "Wade", "Mbodj", "Diallo", "Touré", "Toure", "Ka", "Kâ", "Samb", "Ndour", "Badiane",
    "Camara", "Tall", "Mbengue", "Seck", "Diaw", "Ndoye", "Mboup", "Gaye", "Dramé", "Thiaw", "Diakhaté",
    "Mbow", "Ndong", "Ngom", "Diatta", "Sagna", "Coly", "Mendy", "Sambou", "Diakhité", "Kébé", "Kebe",
    "Mbacké", "Mbacke", "Ndiongue", "Sakho", "Sylla", "Konaté", "Bâ", "Dia", "Ndir", "Fofana", "Wane",
    "Ciss", "Dione", "Diome", "Diedhiou", "Senghor", "Lô", "Ndiour", "Pouye", "Kandji", "Gning", "Dior",
    # Prénoms
    "Moussa", "Awa", "Fatou", "Fatoumata", "Mamadou", "Ibrahima", "Modou", "Aliou", "Abdou", "Abdoulaye",
    "Astou", "Khady", "Khadija", "Aminata", "Mariama", "Ousmane", "Babacar", "Mor", "Pape", "Ndeye", "Ndèye",
    "Sokhna", "Bineta", "Binetou", "Coumba", "Adama", "Amadou", "Assane", "Lamine", "Moustapha", "Saliou",
    "Fallou", "Mame", "Massamba", "Bassirou", "Mbaye", "Omar", "Oumar", "Daouda", "Elhadji", "El Hadji",
    "Ousseynou", "Alioune", "Malick", "Ndiaga", "Samba", "Demba", "Penda", "Dieynaba", "Marème", "Mareme",
    "Seynabou", "Rokhaya", "Yacine", "Codou", "Maimouna", "Maïmouna", "Arame", "Anta", "Ndella", "Soda",
    "Absa", "Oumou", "Rama", "Dibor", "Faty", "Thierno", "Matar", "Mbacké", "Ablaye", "Aïda", "Aida",
]
# Années de l'ère chrétienne : écrites seulement en chiffres (« 2026 », pas « an 2026 » ni « عام 2026 »).
ANNEE = r"(?:1[89]|2[01])\d\d"
_MOTS_ANNEE = {
    "fr": r"(?:en\s+l['’]an|l['’]an(?:née)?|année|an)\s+",
    "en": r"(?:the\s+year|year)\s+",
    "es": r"(?:el\s+año|año)\s+",
    "ar": r"(?:(?<=\s)|^)(?:العام|عام|السنة|سنة)\s+",
}
_ANNEE_PRECISEE = re.compile(
    rf"\b(?:an|année|year|año)\s+{ANNEE}\b|(?:عام|سنة)\s+{ANNEE}|{ANNEE}\s?م(?![\u0600-\u06FF])", re.IGNORECASE
)

# Changer cette version invalide les traductions déjà mémorisées (nouvelle règle de traduction).
VERSION_TRADUCTION = "v6"


def mots_personnalises():
    """Mots ou expressions à ne jamais traduire, saisis par l'administration (un par ligne ou séparés par des virgules)."""
    from .models import Parametres

    texte = Parametres.charger().mots_non_traduits or ""
    mots = {m.strip() for m in re.split(r"[\n,;]+", texte) if len(m.strip()) >= 2}
    return tuple(sorted(mots, key=len, reverse=True))


def version_traduction(mots=None):
    """Version des règles : change aussi quand l'administration modifie la liste de mots."""
    mots = mots_personnalises() if mots is None else mots
    empreinte = hashlib.sha1("\n".join(mots).encode("utf-8")).hexdigest()[:8] if mots else "0"
    return f"{VERSION_TRADUCTION}-{empreinte}"


@functools.lru_cache(maxsize=16)
def _motif_protege(mots=()):
    perso = [r"\s+".join(re.escape(p) for p in m.split()) for m in mots]
    alternatives = (
        [f"(?i:{m})" for m in perso]
        + [LIEUX]
        + [f"(?i:{m})" for m, _ in TERMES_PROTEGES]
        + [re.escape(n).replace(r"\ ", r"\s+") for n in sorted(set(NOMS_PROPRES), key=len, reverse=True)]
        + [ANNEE]
    )
    return re.compile(r"(?<![\w])(?:" + "|".join(alternatives) + r")(?![\w])")


def _forme_arabe(terme):
    for motif, arabe in _TERMES:
        if motif.fullmatch(terme):
            return arabe
    return None


def proteger(texte, mots=()):
    """Échappe le texte en XML et entoure les termes protégés d'une balise ignorée par DeepL."""
    morceaux, position = [], 0
    for trouve in _motif_protege(tuple(mots)).finditer(texte):
        morceaux.append(html.escape(texte[position : trouve.start()], quote=False))
        morceaux.append(f"<x>{html.escape(trouve.group(0), quote=False)}</x>")
        position = trouve.end()
    morceaux.append(html.escape(texte[position:], quote=False))
    return "".join(morceaux)


def retirer_mots_annee(texte, langue, source=""):
    """DeepL ajoute parfois « an », « year », « عام » ou « م » devant/après une année : on garde le chiffre seul
    (sauf si le texte d'origine le précisait lui-même)."""
    if _ANNEE_PRECISEE.search(source):
        return texte
    mots = _MOTS_ANNEE.get(langue)
    if mots:
        texte = re.sub(rf"{mots}(<x>{ANNEE}</x>)", r"\1", texte, flags=re.IGNORECASE)
    if langue == "ar":
        texte = re.sub(rf"(<x>{ANNEE}</x>)\s?م(?![\u0600-\u06FF])", r"\1", texte)
    return texte


def deproteger(texte, langue=None, source=""):
    """Retire les balises. Vers l'arabe, un terme protégé est remplacé APRÈS traduction par sa forme
    arabe usuelle (le faire avant ferait croire à DeepL que le texte est déjà en arabe)."""
    texte = retirer_mots_annee(texte, langue, source)
    if langue == "ar":

        def arabe(trouve):
            terme = html.unescape(trouve.group(2))
            forme = _forme_arabe(terme)
            if not forme:
                return trouve.group(1) + terme
            # Article ajouté par DeepL devant le mot étranger (« الـ ») : la forme arabe le porte déjà.
            prefixe = re.sub(r"(?:ال|ل)ـ?$", lambda m: "ل" if m.group(0).startswith("ل") and not m.group(0).startswith("ال") else "", trouve.group(1))
            return prefixe + forme

        texte = re.sub(r"((?:ال|ل)?ـ?)<x>(.*?)</x>", arabe, texte)
        # « Nuit de Leylatul Khadr » → DeepL écrit déjà « ليلة » devant : on évite « ليلة ليلة القدر ».
        texte = re.sub(r"\b(ل?ليلة)\s*ليلة\b", r"\1", texte)
    return html.unescape(re.sub(r"</?x>", "", texte))


def _appeler_deepl(textes, langue, mots=()):
    cle = settings.DEEPL_API_KEY
    hote = "api-free.deepl.com" if cle.endswith(":fx") else "api.deepl.com"
    corps = json.dumps(
        {
            "text": [proteger(t, mots) for t in textes],
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
        source if r.get("detected_source_language", "").lower() == langue else deproteger(r["text"], langue, source)
        for source, r in zip(textes, resultats)
    ]


def traduire(textes, langue):
    """Traduit une liste de textes vers `langue` en utilisant la mémoire de traductions."""
    if langue not in LANGUES_DEEPL or not settings.DEEPL_API_KEY:
        return list(textes)

    mots = mots_personnalises()
    version = version_traduction(mots)
    empreintes = [Traduction.calculer_empreinte(f"{version}:{t}") for t in textes]
    connues = dict(
        Traduction.objects.filter(empreinte__in=empreintes, langue=langue).values_list("empreinte", "texte_traduit")
    )
    a_traduire = [(e, t) for e, t in zip(empreintes, textes) if e not in connues and t.strip()]
    # Dédoublonne en gardant l'ordre.
    a_traduire = list(dict(a_traduire).items())

    if a_traduire:
        try:
            traduits = _appeler_deepl([t for _, t in a_traduire], langue, mots)
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
