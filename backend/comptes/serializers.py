from dahira_backend.stockage import supprimer_fichier
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Membre

TAILLE_MAX_PHOTO = 5 * 1024 * 1024  # 5 Mo


def valider_photo(photo):
    if photo and photo.size > TAILLE_MAX_PHOTO:
        raise serializers.ValidationError("La photo ne doit pas dépasser 5 Mo.")
    return photo


def valider_telephone_unique(valeur, instance=None):
    valeur = valeur.strip()
    autres = Membre.objects.exclude(pk=getattr(instance, "pk", None))
    if autres.filter(telephone=valeur).exists() or autres.filter(username=valeur).exists():
        raise serializers.ValidationError("Ce numéro de téléphone est déjà utilisé.")
    return valeur


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

    def validate_photo(self, photo):
        return valider_photo(photo)

    def validate_telephone(self, valeur):
        return valider_telephone_unique(valeur, self.instance)

    def update(self, instance, validated_data):
        # Le téléphone sert d'identifiant de connexion : on garde les deux synchronisés.
        if "telephone" in validated_data:
            instance.username = validated_data["telephone"]
        # Remplacer une photo supprime l'ancienne du stockage.
        if "photo" in validated_data and instance.photo:
            supprimer_fichier(instance.photo)
        return super().update(instance, validated_data)


class MembreAdminSerializer(serializers.ModelSerializer):
    """Gestion des membres par l'Administrateur général."""

    nb_cotisations_payees = serializers.IntegerField(read_only=True)

    class Meta:
        model = Membre
        fields = [
            "id",
            "nom_complet",
            "telephone",
            "email",
            "profession",
            "adresse",
            "pays",
            "photo",
            "role",
            "is_active",
            "is_staff",
            "langue_preferee",
            "carte_numero",
            "date_inscription",
            "last_login",
            "nb_cotisations_payees",
        ]
        read_only_fields = ["id", "is_staff", "carte_numero", "date_inscription", "last_login", "photo"]

    def validate_telephone(self, valeur):
        return valider_telephone_unique(valeur, self.instance)

    def validate(self, attrs):
        demandeur = self.context["request"].user
        if self.instance and self.instance.pk == demandeur.pk:
            if "role" in attrs and attrs["role"] != self.instance.role:
                raise serializers.ValidationError({"role": "Vous ne pouvez pas changer votre propre rôle."})
            if attrs.get("is_active") is False:
                raise serializers.ValidationError({"is_active": "Vous ne pouvez pas désactiver votre propre compte."})
        return attrs

    def update(self, instance, validated_data):
        if "telephone" in validated_data:
            instance.username = validated_data["telephone"]
        return super().update(instance, validated_data)


class MembreResumeSerializer(serializers.ModelSerializer):
    """Liste légère des membres (choix d'un membre pour une cotisation, etc.)."""

    class Meta:
        model = Membre
        fields = ["id", "nom_complet", "telephone", "carte_numero", "photo"]


class CarteVerificationSerializer(serializers.ModelSerializer):
    """Informations affichées quand on scanne le QR code d'une carte de membre."""

    class Meta:
        model = Membre
        fields = ["nom_complet", "carte_numero", "photo", "telephone", "adresse"]


class InscriptionSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = Membre
        fields = ["nom_complet", "telephone", "email", "password", "langue_preferee"]
        extra_kwargs = {"langue_preferee": {"required": False}}

    def validate_telephone(self, valeur):
        return valider_telephone_unique(valeur)

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


class ChangerMotDePasseSerializer(serializers.Serializer):
    ancien = serializers.CharField()
    nouveau = serializers.CharField(validators=[validate_password])

    def validate_ancien(self, valeur):
        if not self.context["request"].user.check_password(valeur):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return valeur
