from collections import Counter

from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import serializers

from comptes.models import Membre
from comptes.permissions import ROLES_EVENEMENTS, a_un_role

from . import bus as regles
from .models import Evenement, PaiementBus, PassagerBus, ReservationBus, ResponsableBus


def _utilisateur(serializer):
    request = serializer.context.get("request")
    return request.user if request and request.user.is_authenticated else None


class ResponsableBusSerializer(serializers.ModelSerializer):
    nom = serializers.CharField(source="membre.nom_complet", read_only=True)
    telephone = serializers.CharField(source="membre.telephone", read_only=True)

    class Meta:
        model = ResponsableBus
        fields = ["id", "membre", "nom", "telephone", "numero_wave", "numero_orange_money", "accepte_especes"]
        read_only_fields = ["id", "membre"]


class EvenementSerializer(serializers.ModelSerializer):
    archive_par_nom = serializers.CharField(source="archive_par.nom_complet", read_only=True, default="")
    bus = serializers.SerializerMethodField()
    ma_reservation = serializers.SerializerMethodField()
    nb_reservations = serializers.SerializerMethodField()
    places_restantes = serializers.SerializerMethodField()
    responsables = serializers.SerializerMethodField()
    est_responsable = serializers.SerializerMethodField()
    # État de l'annonce par e-mail (administration seulement, avec ?avec_annonce=1).
    annonce = serializers.SerializerMethodField()
    # Écriture : identifiants des membres désignés responsables des bus.
    responsables_ids = serializers.PrimaryKeyRelatedField(
        queryset=Membre.objects.filter(is_active=True), many=True, write_only=True, required=False
    )

    class Meta:
        model = Evenement
        fields = [
            "archive_le",
            "archive_par_nom",
            "id",
            "titre",
            "description",
            "lieu",
            "categorie",
            "date",
            "reservation_bus_active",
            "nb_bus",
            "places_par_bus",
            "prix_place",
            "visibilite_inscription_a_partir_de",
            "bus",
            "places_restantes",
            "ma_reservation",
            "nb_reservations",
            "responsables",
            "responsables_ids",
            "est_responsable",
            "annonce",
            "cree_par",
            "cree_le",
        ]
        read_only_fields = ["archive_le", "id", "cree_par", "cree_le"]

    # --- Lecture groupée -----------------------------------------------------------------------
    # Pour une liste d'événements, les places occupées et les réservations du membre sont lues en
    # une seule fois pour toute la page (au lieu de plusieurs requêtes par événement).

    def _lot(self, obj):
        lots = self.context.setdefault("_lot_bus", {})
        if obj.pk not in lots:
            parent = getattr(self, "parent", None)
            page = list(parent.instance) if parent is not None and parent.instance is not None else [obj]
            evenements = {e.pk: e for e in page if e.pk not in lots}
            evenements[obj.pk] = obj
            occupation = {pk: Counter() for pk in evenements}
            lignes = (
                PassagerBus.objects.filter(reservation__evenement_id__in=evenements)
                .values("reservation__evenement_id", "bus_numero")
                .annotate(n=Count("id"))
            )
            for ligne in lignes:
                occupation[ligne["reservation__evenement_id"]][ligne["bus_numero"]] = ligne["n"]
            miennes = {}
            user = _utilisateur(self)
            if user:
                resas = (
                    ReservationBus.objects.filter(evenement_id__in=evenements, membre=user, annulee=False)
                    .select_related("membre")
                    .prefetch_related(
                        "passagers", "paiements__responsable__membre", "paiements__declare_par", "paiements__traite_par"
                    )
                )
                for resa in resas:
                    resa.evenement = evenements[resa.evenement_id]  # avec ses responsables déjà chargés
                    miennes[resa.evenement_id] = resa
            for pk in evenements:
                lots[pk] = {"occupation": occupation[pk], "ma_reservation": miennes.get(pk)}
        return lots[obj.pk]

    def get_bus(self, obj):
        """Places de chaque bus : [{numero, places_total, places_restantes}]."""
        if not obj.reservation_bus_active or not obj.nb_bus:
            return []
        occupees = self._lot(obj)["occupation"]
        total = obj.places_par_bus or 0
        return [
            {"numero": n, "places_total": total, "places_restantes": max(total - occupees.get(n, 0), 0)}
            for n in range(1, obj.nb_bus + 1)
        ]

    def get_places_restantes(self, obj):
        if not obj.reservation_bus_active:
            return 0
        return max(regles.capacite(obj) - sum(self._lot(obj)["occupation"].values()), 0)

    def get_ma_reservation(self, obj):
        if not _utilisateur(self):
            return None
        resa = self._lot(obj)["ma_reservation"]
        return ReservationBusSerializer(resa, context=self.context).data if resa else None

    def get_nb_reservations(self, obj):
        return sum(self._lot(obj)["occupation"].values())

    def get_responsables(self, obj):
        # Noms et numéros des responsables : visibles seulement par les membres connectés.
        if not _utilisateur(self):
            return []
        return ResponsableBusSerializer(obj.responsables_bus.all(), many=True).data

    def get_annonce(self, obj):
        request = self.context.get("request")
        if not request or request.query_params.get("avec_annonce") != "1":
            return None
        if not a_un_role(request.user, ROLES_EVENEMENTS):
            return None
        from .annonces import etat

        return etat(obj)

    def get_est_responsable(self, obj):
        user = _utilisateur(self)
        return bool(user) and regles.est_responsable(user, obj)

    def validate(self, attrs):
        def valeur(champ, defaut=None):
            return attrs.get(champ, getattr(self.instance, champ, defaut))

        if valeur("reservation_bus_active", False):
            if not valeur("nb_bus"):
                raise serializers.ValidationError({"nb_bus": "Indiquez le nombre de bus."})
            if not valeur("places_par_bus"):
                raise serializers.ValidationError({"places_par_bus": "Indiquez le nombre de places par bus."})
        if self.instance and ("nb_bus" in attrs or "places_par_bus" in attrs):
            occupees = regles.places_occupees(self.instance)
            nb_bus = valeur("nb_bus") or 0
            hors = sorted(n for n in occupees if n > nb_bus)
            if hors:
                raise serializers.ValidationError(
                    {"nb_bus": f"Des passagers sont déjà dans le bus {hors[0]} : déplacez-les avant de le retirer."}
                )
            places = valeur("places_par_bus") or 0
            plein = max(occupees.values(), default=0)
            if places and plein > places:
                raise serializers.ValidationError(
                    {"places_par_bus": f"Un bus compte déjà {plein} passagers : impossible de descendre à {places}."}
                )
        prix = attrs.get("prix_place")
        if prix is not None and prix < 0:
            raise serializers.ValidationError({"prix_place": "Le prix ne peut pas être négatif."})
        return attrs

    def _enregistrer_responsables(self, evenement, membres):
        if membres is None:
            return
        evenement.responsables_bus.exclude(membre__in=membres).delete()
        deja = set(evenement.responsables_bus.values_list("membre_id", flat=True))
        for membre in membres:
            if membre.pk not in deja:
                # Numéros pré-remplis avec son téléphone : il pourra les changer dans son Espace bus.
                ResponsableBus.objects.create(
                    evenement=evenement,
                    membre=membre,
                    numero_wave=membre.telephone,
                    numero_orange_money=membre.telephone,
                )

    def create(self, validated_data):
        membres = validated_data.pop("responsables_ids", None)
        evenement = super().create(validated_data)
        self._enregistrer_responsables(evenement, membres)
        return evenement

    def update(self, instance, validated_data):
        membres = validated_data.pop("responsables_ids", None)
        evenement = super().update(instance, validated_data)
        self._enregistrer_responsables(evenement, membres)
        return evenement


class PassagerBusSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = PassagerBus
        fields = ["id", "nom", "est_titulaire", "bus_numero"]
        read_only_fields = ["bus_numero"]
        # « Moi » : le nom est rempli automatiquement avec celui du membre.
        extra_kwargs = {"est_titulaire": {"required": False}, "nom": {"required": False, "allow_blank": True}}


class PaiementBusSerializer(serializers.ModelSerializer):
    responsable_nom = serializers.CharField(source="responsable.membre.nom_complet", read_only=True, default="")
    declare_par_nom = serializers.CharField(source="declare_par.nom_complet", read_only=True, default="")
    traite_par_nom = serializers.CharField(source="traite_par.nom_complet", read_only=True, default="")

    class Meta:
        model = PaiementBus
        fields = [
            "id",
            "montant",
            "moyen",
            "reference",
            "note",
            "responsable",
            "responsable_nom",
            "statut",
            "declare_par_nom",
            "declare_le",
            "traite_par_nom",
            "traite_le",
        ]
        read_only_fields = ["id", "statut", "declare_le", "traite_le"]

    def validate_montant(self, valeur):
        if valeur <= 0:
            raise serializers.ValidationError("Indiquez un montant positif.")
        return valeur

    def validate(self, attrs):
        reservation = self.context["reservation"]
        responsable = attrs.get("responsable")
        if responsable and responsable.evenement_id != reservation.evenement_id:
            raise serializers.ValidationError({"responsable": "Ce responsable ne gère pas cet événement."})
        return attrs


class ReservationBusSerializer(serializers.ModelSerializer):
    """Réservation complète : passagers (avec leur bus), paiements, montants et statut."""

    evenement_titre = serializers.CharField(source="evenement.titre", read_only=True)
    titulaire_nom = serializers.CharField(read_only=True)
    titulaire_telephone = serializers.CharField(read_only=True)
    passagers = PassagerBusSerializer(many=True)
    paiements = PaiementBusSerializer(many=True, read_only=True)
    acceptee_par_nom = serializers.CharField(source="acceptee_par.nom_complet", read_only=True, default="")
    nb_places = serializers.SerializerMethodField()
    montant_du = serializers.SerializerMethodField()
    montant_paye = serializers.SerializerMethodField()
    montant_a_verifier = serializers.SerializerMethodField()
    statut = serializers.SerializerMethodField()
    modifiable = serializers.SerializerMethodField()

    class Meta:
        model = ReservationBus
        fields = [
            "id",
            "evenement",
            "evenement_titre",
            "membre",
            "titulaire_nom",
            "titulaire_telephone",
            "nom_contact",
            "telephone_contact",
            "passagers",
            "paiements",
            "nb_places",
            "montant_du",
            "montant_paye",
            "montant_a_verifier",
            "statut",
            "acceptee",
            "acceptee_par_nom",
            "annulee",
            "modifiable",
            "date_reservation",
        ]
        read_only_fields = ["id", "membre", "acceptee", "annulee", "date_reservation"]

    def get_nb_places(self, obj):
        return len(obj.passagers.all())

    def get_montant_du(self, obj):
        return regles.montant_du(obj)

    def get_montant_paye(self, obj):
        return regles.total_paiements(obj, PaiementBus.Statut.VALIDE)

    def get_montant_a_verifier(self, obj):
        return regles.total_paiements(obj, PaiementBus.Statut.A_VERIFIER)

    def get_statut(self, obj):
        return regles.statut_reservation(obj)

    def get_modifiable(self, obj):
        user = _utilisateur(self)
        if not user or obj.annulee:
            return False
        return regles.est_responsable(user, obj.evenement) or regles.modifiable_par_membre(obj)

    # ---- Écriture ----------------------------------------------------------------------------

    def validate_passagers(self, passagers):
        if not passagers:
            raise serializers.ValidationError("Ajoutez au moins une personne.")
        if len(passagers) > regles.MAX_PASSAGERS:
            raise serializers.ValidationError(f"{regles.MAX_PASSAGERS} places au maximum par réservation.")
        for p in passagers:
            p["nom"] = " ".join(p.get("nom", "").split())
            if not p.get("est_titulaire") and len(p["nom"]) < 2:
                raise serializers.ValidationError("Écrivez le prénom et le nom de chaque personne.")
        if sum(1 for p in passagers if p.get("est_titulaire")) > 1:
            raise serializers.ValidationError("« Moi » ne peut être choisi qu'une seule fois.")
        return passagers

    def validate(self, attrs):
        evenement = attrs.get("evenement", getattr(self.instance, "evenement", None))
        if self.instance and "evenement" in attrs and attrs["evenement"] != self.instance.evenement:
            raise serializers.ValidationError({"evenement": "Impossible de changer d'événement."})
        if not evenement.reservation_bus_active or not evenement.nb_bus or not evenement.places_par_bus:
            raise serializers.ValidationError("La réservation de bus n'est pas ouverte pour cet événement.")
        if evenement.date < timezone.now():
            raise serializers.ValidationError("Cet événement est déjà passé.")
        user = _utilisateur(self)
        responsable = regles.est_responsable(user, evenement)
        pour_autrui = not self.instance and bool(attrs.get("nom_contact", "").strip())
        if pour_autrui and not responsable:
            raise serializers.ValidationError("Seul un responsable peut réserver pour une autre personne.")
        if not self.instance and not pour_autrui:
            if ReservationBus.objects.filter(evenement=evenement, membre=user, annulee=False).exists():
                raise serializers.ValidationError("Vous avez déjà une réservation pour cet événement : modifiez-la.")
        if self.instance and not responsable and not regles.modifiable_par_membre(self.instance):
            raise serializers.ValidationError(
                "Un paiement a déjà été validé : contactez un responsable pour modifier la réservation."
            )
        attrs["_pour_autrui"] = pour_autrui
        return attrs

    def _nom_titulaire(self, reservation):
        return reservation.membre.nom_complet if reservation.membre_id else reservation.nom_contact

    def _ajouter(self, reservation, nouveaux):
        numeros = regles.attribuer_bus(reservation.evenement, len(nouveaux))
        PassagerBus.objects.bulk_create(
            PassagerBus(
                reservation=reservation,
                nom=self._nom_titulaire(reservation) if p.get("est_titulaire") else p["nom"],
                est_titulaire=bool(p.get("est_titulaire")),
                bus_numero=numero,
            )
            for p, numero in zip(nouveaux, numeros)
        )

    def create(self, validated_data):
        passagers = validated_data.pop("passagers")
        pour_autrui = validated_data.pop("_pour_autrui")
        user = _utilisateur(self)
        with transaction.atomic():
            # Verrou : deux réservations simultanées ne peuvent pas prendre la même dernière place.
            Evenement.objects.select_for_update().get(pk=validated_data["evenement"].pk)
            reservation = ReservationBus.objects.create(
                evenement=validated_data["evenement"],
                membre=None if pour_autrui else user,
                nom_contact=validated_data.get("nom_contact", "").strip() if pour_autrui else "",
                telephone_contact=validated_data.get("telephone_contact", "").strip() if pour_autrui else "",
                creee_par=user,
                # Une réservation saisie par un responsable est acceptée d'office.
                acceptee=pour_autrui,
                acceptee_par=user if pour_autrui else None,
            )
            self._ajouter(reservation, passagers)
        return reservation

    def update(self, instance, validated_data):
        passagers = validated_data.pop("passagers", None)
        validated_data.pop("_pour_autrui", None)
        with transaction.atomic():
            Evenement.objects.select_for_update().get(pk=instance.evenement_id)
            if instance.membre_id is None:
                for champ in ("nom_contact", "telephone_contact"):
                    if champ in validated_data:
                        setattr(instance, champ, validated_data[champ].strip())
                instance.save()
            if passagers is not None:
                existants = {p.pk: p for p in instance.passagers.all()}
                gardes = {p["id"] for p in passagers if p.get("id") in existants}
                instance.passagers.exclude(pk__in=gardes).delete()
                for p in passagers:
                    if p.get("id") in existants:
                        passager = existants[p["id"]]
                        passager.est_titulaire = bool(p.get("est_titulaire"))
                        passager.nom = self._nom_titulaire(instance) if passager.est_titulaire else p["nom"]
                        passager.save(update_fields=["nom", "est_titulaire"])
                self._ajouter(instance, [p for p in passagers if p.get("id") not in existants])
        return instance


class LigneReservationSerializer(ReservationBusSerializer):
    """Même contenu, pour la liste du responsable (avec qui a accepté et créé)."""

    creee_par_nom = serializers.CharField(source="creee_par.nom_complet", read_only=True, default="")

    class Meta(ReservationBusSerializer.Meta):
        fields = ReservationBusSerializer.Meta.fields + ["creee_par_nom"]
