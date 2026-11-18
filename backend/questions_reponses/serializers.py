from rest_framework import serializers

from .models import Question, Reponse


class ReponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reponse
        fields = ["id", "question", "repondant", "texte", "audio", "date_publication"]
        read_only_fields = ["id", "repondant", "date_publication"]


class QuestionSerializer(serializers.ModelSerializer):
    reponse = ReponseSerializer(read_only=True)
    membre_nom = serializers.CharField(source="membre.nom_complet", read_only=True)

    class Meta:
        model = Question
        fields = [
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
        read_only_fields = ["id", "membre", "statut", "date_creation"]
