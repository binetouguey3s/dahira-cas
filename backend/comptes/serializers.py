from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers

from dahira_backend.stockage import supprimer_fichier
from .models import Membre
from .telephone import normaliser_telephone, valider_pays, valider_telephone

TAILLE_MAX_PHOTO = 5 * 1024 * 1024  # 5 Mo


def valider_photo(photo):
    if photo and photo.size > TAILLE_MAX_PHOTO:
        raise serializers.ValidationError("La photo ne doit pas dépasser 5 Mo.")
    return photo


def valider_telephone_unique(valeur, instance=None):
    valeur = valider_telephone(valeur)
    autres = Membre.objects.exclude(pk=getattr(instance, "pk", None))
    if autres.filter(telephone=valeur).exists() or autres.filter(username=valeur).exists():
        raise serializers.ValidationError("Ce numéro de téléphone est déjà utilisé.")
    return valeur


class MembreSerializer(serializers.ModelSerializer):
    """Profil du membre connecté (GET/PATCH /api/comptes/moi/)."""

    # Vrai si le membre gère les bus d'un événement à venir (affiche son « Espace bus »).
    est_responsable_bus = serializers.SerializerMethodField()

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
            "est_responsable_bus",
            "recevoir_annonces",
        ]
        read_only_fields = ["id", "username", "role", "is_staff", "carte_numero", "date_inscription"]

    def get_est_responsable_bus(self, obj):
        from datetime import timedelta

        from django.utils import timezone

        return obj.responsabilites_bus.filter(
            evenement__reservation_bus_active=True, evenement__date__gte=timezone.now() - timedelta(days=7)
        ).exists()

    def validate_photo(self, photo):
        return valider_photo(photo)

    def validate_telephone(self, valeur):
        return valider_telephone_unique(valeur, self.instance)

    def validate_pays(self, valeur):
        return valider_pays(valeur)

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
            "sans_compte",
        ]
        read_only_fields = ["id", "is_staff", "carte_numero", "date_inscription", "last_login", "photo", "sans_compte"]
        extra_kwargs = {"telephone": {"required": False, "allow_blank": True}}

    def validate_telephone(self, valeur):
        # Un membre sans compte peut ne pas avoir de téléphone ; un compte normal en a toujours un.
        if not (valeur or "").strip() and self.instance and self.instance.sans_compte:
            return ""
        return valider_telephone_unique(valeur, self.instance)

    def validate_pays(self, valeur):
        return valider_pays(valeur)

    def validate(self, attrs):
        if not self.instance and not attrs.get("telephone"):
            raise serializers.ValidationError({"telephone": "Indiquez le numéro de téléphone."})
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
        fields = ["id", "nom_complet", "telephone", "carte_numero", "photo", "sans_compte"]


class MembreSansCompteSerializer(serializers.ModelSerializer):
    """Membre ajouté par la Finance sans compte sur la plateforme (téléphone facultatif)."""

    class Meta:
        model = Membre
        fields = ["id", "nom_complet", "telephone", "adresse", "carte_numero", "sans_compte"]
        read_only_fields = ["id", "carte_numero", "sans_compte"]
        extra_kwargs = {"telephone": {"required": False, "allow_blank": True}}

    def validate_nom_complet(self, valeur):
        valeur = " ".join(valeur.split())
        if len(valeur) < 2:
            raise serializers.ValidationError("Écrivez le prénom et le nom.")
        return valeur

    def validate_telephone(self, valeur):
        if not (valeur or "").strip():
            return ""
        return valider_telephone_unique(valeur, self.instance)

    def create(self, validated_data):
        import uuid

        membre = Membre(
            username=f"sans-compte-{uuid.uuid4().hex[:12]}",
            nom_complet=validated_data["nom_complet"],
            telephone=validated_data.get("telephone", ""),
            adresse=validated_data.get("adresse", ""),
            sans_compte=True,
        )
        membre.set_unusable_password()  # ne peut pas se connecter
        membre.save()
        return membre


class CarteVerificationSerializer(serializers.ModelSerializer):
    """Informations affichées quand on scanne le QR code d'une carte de membre."""

    class Meta:
        model = Membre
        fields = ["nom_complet", "carte_numero", "photo", "telephone", "adresse"]


class InscriptionSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    # Numéro saisi une deuxième fois (facultatif pour les anciens clients) : doit être identique.
    telephone_confirmation = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Membre
        fields = ["nom_complet", "telephone", "telephone_confirmation", "email", "password", "langue_preferee"]
        extra_kwargs = {"langue_preferee": {"required": False}}

    def validate_telephone(self, valeur):
        valeur = valider_telephone(valeur)
        existants = Membre.objects.filter(Q(telephone=valeur) | Q(username=valeur))
        # Un membre ajouté par la Finance sans compte, avec ce numéro : son inscription le rattache
        # (il retrouve son numéro de carte et ses cotisations).
        if existants.exclude(sans_compte=True).exists():
            raise serializers.ValidationError("Ce numéro de téléphone est déjà utilisé.")
        self._a_rattacher = existants.filter(sans_compte=True).first()
        return valeur

    def validate(self, attrs):
        confirmation = attrs.pop("telephone_confirmation", "")
        if confirmation and normaliser_telephone(confirmation) != attrs["telephone"]:
            raise serializers.ValidationError(
                {"telephone_confirmation": "Les deux numéros ne sont pas identiques."}
            )
        return attrs

    def create(self, validated_data):
        membre = getattr(self, "_a_rattacher", None) or Membre()
        membre.username = validated_data["telephone"]
        membre.nom_complet = validated_data["nom_complet"]
        membre.telephone = validated_data["telephone"]
        membre.email = validated_data.get("email", "")
        membre.langue_preferee = validated_data.get("langue_preferee", Membre.Langue.FR)
        membre.sans_compte = False
        membre.is_active = True
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


class MotDePasseOublieSerializer(serializers.Serializer):
    identifiant = serializers.CharField(max_length=254)


class ReinitialiserMotDePasseSerializer(serializers.Serializer):
    uid = serializers.CharField()
    jeton = serializers.CharField()
    nouveau = serializers.CharField()
