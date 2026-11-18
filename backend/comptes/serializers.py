from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Membre


class MembreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membre
        fields = [
            "id",
            "username",
            "nom_complet",
            "telephone",
            "email",
            "profession",
            "adresse",
            "pays",
            "photo",
            "role",
            "langue_preferee",
            "carte_numero",
            "date_inscription",
        ]
        read_only_fields = ["id", "role", "carte_numero", "date_inscription"]


class InscriptionSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = Membre
        fields = ["nom_complet", "telephone", "email", "password"]

    def create(self, validated_data):
        membre = Membre(
            username=validated_data["telephone"],
            nom_complet=validated_data["nom_complet"],
            telephone=validated_data["telephone"],
            email=validated_data.get("email", ""),
        )
        membre.set_password(validated_data["password"])
        membre.save()
        return membre
