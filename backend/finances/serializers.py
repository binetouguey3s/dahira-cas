from rest_framework import serializers

from .models import Cotisation


class CotisationSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source="membre.nom_complet", read_only=True)

    class Meta:
        model = Cotisation
        fields = [
            "id",
            "membre",
            "membre_nom",
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
