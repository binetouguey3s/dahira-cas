from rest_framework import serializers

from .models import Evenement, ReservationBus


class EvenementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evenement
        fields = [
            "id",
            "titre",
            "description",
            "lieu",
            "categorie",
            "date",
            "reservation_bus_active",
            "nb_bus",
            "places_par_bus",
            "visibilite_inscription_a_partir_de",
            "cree_par",
            "cree_le",
        ]
        read_only_fields = ["id", "cree_par", "cree_le"]


class ReservationBusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationBus
        fields = ["id", "evenement", "membre", "bus_numero", "nb_places", "date_reservation"]
        read_only_fields = ["id", "membre", "date_reservation"]
