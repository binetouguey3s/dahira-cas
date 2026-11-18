from rest_framework import serializers

from .models import Cotisation


class CotisationSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source="membre.nom_complet", read_only=True)
    membre_telephone = serializers.CharField(source="membre.telephone", read_only=True)

    class Meta:
        model = Cotisation
        fields = [
            "id",
            "membre",
            "membre_nom",
            "membre_telephone",
            "mois",
            "annee",
            "montant",
            "statut",
            "moyen_paiement",
            "reference_transaction",
            "date_paiement",
            "cree_le",
        ]
        read_only_fields = ["id", "cree_le"]

    def validate_mois(self, mois):
        if not 1 <= mois <= 12:
            raise serializers.ValidationError("Mois invalide.")
        return mois

    def validate_annee(self, annee):
        if not 2000 <= annee <= 2100:
            raise serializers.ValidationError("Année invalide.")
        return annee

    def validate_montant(self, montant):
        if montant <= 0:
            raise serializers.ValidationError("Le montant doit être positif.")
        return montant


class GenererCotisationsSerializer(serializers.Serializer):
    mois = serializers.IntegerField(min_value=1, max_value=12)
    annee = serializers.IntegerField(min_value=2000, max_value=2100)
    montant = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
