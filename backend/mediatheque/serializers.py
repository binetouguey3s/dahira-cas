from rest_framework import serializers

from .models import ContenuMedia


class ContenuMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContenuMedia
        fields = [
            "id",
            "titre",
            "description",
            "type",
            "fichier",
            "url_externe",
            "auteur",
            "evenement",
            "nb_likes",
            "nb_telechargements",
            "date_publication",
        ]
        read_only_fields = ["id", "nb_likes", "nb_telechargements", "date_publication"]
