"""Numéros de téléphone : format international unique (E.164, ex. +221771234567)."""

import phonenumbers
from rest_framework import serializers

REGION_PAR_DEFAUT = "SN"  # un numéro saisi sans indicatif est considéré comme sénégalais
REGIONS = set(phonenumbers.SUPPORTED_REGIONS)


def normaliser_telephone(valeur: str, region: str = REGION_PAR_DEFAUT) -> str | None:
    """Renvoie le numéro au format E.164, ou None s'il n'est pas valide."""
    valeur = (valeur or "").strip()
    if not valeur:
        return None
    if valeur.startswith("00"):
        valeur = "+" + valeur[2:]
    try:
        numero = phonenumbers.parse(valeur, region if region in REGIONS else REGION_PAR_DEFAUT)
    except phonenumbers.NumberParseException:
        return None
    if not phonenumbers.is_valid_number(numero):
        return None
    return phonenumbers.format_number(numero, phonenumbers.PhoneNumberFormat.E164)


def valider_telephone(valeur: str) -> str:
    numero = normaliser_telephone(valeur)
    if not numero:
        raise serializers.ValidationError("Numéro de téléphone invalide. Vérifiez l'indicatif du pays et le numéro.")
    return numero


def valider_pays(valeur: str) -> str:
    valeur = (valeur or "").strip().upper()
    if valeur and valeur not in REGIONS:
        raise serializers.ValidationError("Pays inconnu.")
    return valeur


def identifiants_possibles(saisie: str) -> list[str]:
    """Écritures possibles d'un identifiant : tel quel, au format international, et sans indicatif."""
    saisie = (saisie or "").strip()
    candidats = [saisie]
    numero = normaliser_telephone(saisie)
    if numero:
        national = str(phonenumbers.parse(numero).national_number)
        candidats += [numero, national, numero.lstrip("+"), saisie.replace(" ", "")]
    return list(dict.fromkeys(c for c in candidats if c))
