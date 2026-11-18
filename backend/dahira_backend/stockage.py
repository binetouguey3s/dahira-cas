"""Choix du stockage des fichiers audio et vidéo.

Avec Cloudinary configuré, l'audio et la vidéo vont dans l'espace « video » de
Cloudinary (l'espace « image » les refuserait). Sans Cloudinary, stockage local.
"""

from django.conf import settings
from django.core.files.storage import default_storage


def stockage_audio_video():
    if settings.CLOUDINARY_CLOUD_NAME:
        from cloudinary_storage.storage import VideoMediaCloudinaryStorage

        return VideoMediaCloudinaryStorage()
    return default_storage
