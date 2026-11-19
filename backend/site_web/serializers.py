from rest_framework import serializers

from dahira_backend.stockage import supprimer_fichier
from .models import Parametres
from .traduction import LANGUES_SITE

TAILLE_MAX_IMAGE = 5 * 1024 * 1024


class ParametresSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parametres
        exclude = ["id"]
        read_only_fields = ["modifie_le"]

    def _valider_image(self, image):
        if image and image.size > TAILLE_MAX_IMAGE:
            raise serializers.ValidationError("L'image ne doit pas dépasser 5 Mo.")
        return image

    validate_logo = _valider_image
    validate_photo_guide = _valider_image

    def update(self, instance, validated_data):
        for champ in ("logo", "photo_guide"):
            if champ in validated_data and getattr(instance, champ):
                supprimer_fichier(getattr(instance, champ))
        return super().update(instance, validated_data)


class TraductionSerializer(serializers.Serializer):
    textes = serializers.ListField(
        child=serializers.CharField(allow_blank=True, max_length=5000, trim_whitespace=False),
        max_length=50,
    )
    langue = serializers.ChoiceField(choices=LANGUES_SITE)
