"""Réponses d'erreur lisibles pour l'API."""

import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def gestionnaire_erreurs(exc, context):
    reponse = exception_handler(exc, context)
    if reponse is not None:
        return reponse
    # Panne du service de stockage des fichiers (Cloudinary) : message clair plutôt qu'une page 500.
    if type(exc).__module__.startswith("cloudinary"):
        logger.error("Erreur Cloudinary : %s", exc, exc_info=exc)
        return Response(
            {"detail": "L'envoi du fichier a échoué (service de stockage indisponible). Réessayez dans un instant."},
            status=503,
        )
    return None
