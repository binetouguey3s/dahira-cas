from rest_framework import serializers

from .models import Question, Reponse

TAILLE_MAX_AUDIO = 15 * 1024 * 1024  # 15 Mo, soit plusieurs minutes de vocal


def valider_audio(audio):
    if not audio:
        return audio
    if audio.size > TAILLE_MAX_AUDIO:
        raise serializers.ValidationError("Le message vocal ne doit pas dépasser 15 Mo.")
    type_mime = getattr(audio, "content_type", "") or ""
    if type_mime and not (type_mime.startswith("audio/") or type_mime == "video/webm"):
        raise serializers.ValidationError("Le fichier doit être un enregistrement audio.")
    return audio


def exiger_texte_ou_audio(attrs, instance):
    texte = attrs.get("texte", getattr(instance, "texte", "") if instance else "")
    audio = attrs.get("audio", getattr(instance, "audio", None) if instance else None)
    if not (texte or "").strip() and not audio:
        raise serializers.ValidationError("Écrivez un message ou enregistrez un vocal.")
    return attrs


class ReponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reponse
        fields = ["id", "question", "repondant", "texte", "audio", "date_publication"]
        read_only_fields = ["id", "repondant", "date_publication"]

    validate_audio = staticmethod(valider_audio)

    def validate(self, attrs):
        return exiger_texte_ou_audio(attrs, self.instance)


class QuestionSerializer(serializers.ModelSerializer):
    archive_par_nom = serializers.CharField(source="archive_par.nom_complet", read_only=True, default="")
    reponse = ReponseSerializer(read_only=True)
    membre_nom = serializers.CharField(source="membre.nom_complet", read_only=True)

    class Meta:
        model = Question
        fields = [
            "archive_le",
            "archive_par_nom",
            "id",
            "membre",
            "membre_nom",
            "theme",
            "texte",
            "audio",
            "statut",
            "date_creation",
            "reponse",
        ]
        read_only_fields = ["archive_le", "id", "membre", "statut", "date_creation"]

    validate_audio = staticmethod(valider_audio)

    def validate(self, attrs):
        return exiger_texte_ou_audio(attrs, self.instance)
