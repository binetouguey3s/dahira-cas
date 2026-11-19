"""Choix du stockage des fichiers audio et vidéo.

Avec Cloudinary configuré, l'audio et la vidéo vont dans l'espace « video » de
Cloudinary (l'espace « image » les refuserait). Sans Cloudinary, stockage local.
"""

import logging

from django.conf import settings
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


def stockage_audio_video():
    if settings.CLOUDINARY_CLOUD_NAME:
        from cloudinary_storage.storage import VideoMediaCloudinaryStorage

        return VideoMediaCloudinaryStorage()
    return default_storage


def supprimer_fichier(fichier):
    """Supprime un fichier du stockage sans jamais bloquer l'enregistrement.

    Un ancien fichier peut avoir déjà disparu (stockage local effacé par un
    redéploiement, fichier envoyé avant Cloudinary…) : on l'ignore simplement.
    """
    if not fichier:
        return
    try:
        fichier.delete(save=False)
    except Exception:  # noqa: BLE001 — la suppression est un simple nettoyage
        logger.warning("Suppression impossible de %s", getattr(fichier, "name", fichier), exc_info=True)
