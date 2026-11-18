from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Membre


class MembreSerializer(serializers.ModelSerializer):
    """Profil du membre connecté (GET/PATCH /api/comptes/moi/)."""

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
            "is_staff",
            "langue_preferee",
            "carte_numero",
            "date_inscription",
        ]
        read_only_fields = ["id", "username", "role", "is_staff", "carte_numero", "date_inscription"]

    def validate_telephone(self, valeur):
        valeur = valeur.strip()
        deja_pris = Membre.objects.filter(telephone=valeur)
        if self.instance:
            deja_pris = deja_pris.exclude(pk=self.instance.pk)
        if deja_pris.exists() or Membre.objects.filter(username=valeur).exclude(
            pk=getattr(self.instance, "pk", None)
        ).exists():
            raise serializers.ValidationError("Ce numéro de téléphone est déjà utilisé.")
        return valeur

    def update(self, instance, validated_data):
        # Le téléphone sert d'identifiant de connexion : on garde les deux synchronisés.
        if "telephone" in validated_data:
            instance.username = validated_data["telephone"]
        return super().update(instance, validated_data)


class InscriptionSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = Membre
        fields = ["nom_complet", "telephone", "email", "password", "langue_preferee"]
        extra_kwargs = {"langue_preferee": {"required": False}}

    def validate_telephone(self, valeur):
        valeur = valeur.strip()
        if Membre.objects.filter(username=valeur).exists():
            raise serializers.ValidationError("Ce numéro de téléphone est déjà utilisé.")
        return valeur

    def create(self, validated_data):
        membre = Membre(
            username=validated_data["telephone"],
            nom_complet=validated_data["nom_complet"],
            telephone=validated_data["telephone"],
            email=validated_data.get("email", ""),
            langue_preferee=validated_data.get("langue_preferee", Membre.Langue.FR),
        )
        membre.set_password(validated_data["password"])
        membre.save()
        return membre
