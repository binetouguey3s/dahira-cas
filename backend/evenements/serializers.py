from django.db.models import Sum
from rest_framework import serializers

from .models import Evenement, ReservationBus


class EvenementSerializer(serializers.ModelSerializer):
    bus = serializers.SerializerMethodField()
    ma_reservation = serializers.SerializerMethodField()
    nb_reservations = serializers.SerializerMethodField()

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
            "bus",
            "ma_reservation",
            "nb_reservations",
            "cree_par",
            "cree_le",
        ]
        read_only_fields = ["id", "cree_par", "cree_le"]

    def get_bus(self, obj):
        """Places restantes pour chaque bus : [{numero, places_total, places_restantes}]."""
        if not obj.reservation_bus_active or not obj.nb_bus:
            return []
        occupees = dict(
            obj.reservations_bus.values("bus_numero").annotate(t=Sum("nb_places")).values_list("bus_numero", "t")
        )
        total = obj.places_par_bus or 0
        return [
            {
                "numero": n,
                "places_total": total,
                "places_restantes": max(total - (occupees.get(n) or 0), 0) if total else None,
            }
            for n in range(1, obj.nb_bus + 1)
        ]

    def get_ma_reservation(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        resa = obj.reservations_bus.filter(membre=request.user).first()
        return ReservationBusSerializer(resa).data if resa else None

    def get_nb_reservations(self, obj):
        return obj.reservations_bus.aggregate(t=Sum("nb_places"))["t"] or 0

    def validate(self, attrs):
        actif = attrs.get("reservation_bus_active", getattr(self.instance, "reservation_bus_active", False))
        nb_bus = attrs.get("nb_bus", getattr(self.instance, "nb_bus", None))
        if actif and not nb_bus:
            raise serializers.ValidationError({"nb_bus": "Indiquez le nombre de bus."})
        return attrs


class ReservationBusSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source="membre.nom_complet", read_only=True)
    membre_telephone = serializers.CharField(source="membre.telephone", read_only=True)
    evenement_titre = serializers.CharField(source="evenement.titre", read_only=True)

    class Meta:
        model = ReservationBus
        fields = [
            "id",
            "evenement",
            "evenement_titre",
            "membre",
            "membre_nom",
            "membre_telephone",
            "bus_numero",
            "nb_places",
            "date_reservation",
        ]
        read_only_fields = ["id", "membre", "date_reservation"]

    def validate(self, attrs):
        evenement = attrs.get("evenement", getattr(self.instance, "evenement", None))
        bus = attrs.get("bus_numero", getattr(self.instance, "bus_numero", None))
        places = attrs.get("nb_places", getattr(self.instance, "nb_places", 1))
        if self.instance and "evenement" in attrs and attrs["evenement"] != self.instance.evenement:
            raise serializers.ValidationError({"evenement": "Impossible de changer d'événement."})
        if not evenement.reservation_bus_active or not evenement.nb_bus:
            raise serializers.ValidationError("La réservation de bus n'est pas ouverte pour cet événement.")
        if not 1 <= bus <= evenement.nb_bus:
            raise serializers.ValidationError({"bus_numero": "Ce bus n'existe pas."})
        if not 1 <= places <= 10:
            raise serializers.ValidationError({"nb_places": "Entre 1 et 10 places par réservation."})
        if evenement.places_par_bus:
            occupees = (
                evenement.reservations_bus.filter(bus_numero=bus)
                .exclude(pk=getattr(self.instance, "pk", None))
                .aggregate(t=Sum("nb_places"))["t"]
                or 0
            )
            if occupees + places > evenement.places_par_bus:
                restantes = max(evenement.places_par_bus - occupees, 0)
                raise serializers.ValidationError({"nb_places": f"Plus que {restantes} place(s) dans ce bus."})
        request = self.context.get("request")
        if (
            not self.instance
            and request
            and ReservationBus.objects.filter(evenement=evenement, membre=request.user).exists()
        ):
            raise serializers.ValidationError("Vous avez déjà une réservation pour cet événement.")
        return attrs
