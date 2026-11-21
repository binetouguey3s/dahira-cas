from django.conf import settings
from django.db import models

from dahira_backend.archives import Archivable


class Evenement(Archivable):
    class Categorie(models.TextChoices):
        MAGAL = "magal", "Magal"
        GAMOU = "gamou", "Gamou"
        DAHIRA = "dahira", "Dahira"
        CAUSERIE = "causerie", "Causerie"
        NISFOU_SHABAAN = "nisfou_shabaan", "Nisfou Shabaan"
        LEYLATUL_KHADR = "leylatul_khadr", "Leylatul Khadr"
        AUTRE = "autre", "Autre"

    titre = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    lieu = models.CharField(max_length=200, blank=True)
    categorie = models.CharField(max_length=20, choices=Categorie.choices, default=Categorie.AUTRE)
    date = models.DateTimeField()
    reservation_bus_active = models.BooleanField(default=False)
    nb_bus = models.PositiveSmallIntegerField(blank=True, null=True)
    places_par_bus = models.PositiveSmallIntegerField(blank=True, null=True)
    # Prix d'une place (vide ou 0 : bus gratuit).
    prix_place = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # Annonce par e-mail aux membres (envoyée par lots : la suite part le lendemain si le quota est atteint).
    annonce_demandee_le = models.DateTimeField(blank=True, null=True)
    annonce_demandee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    visibilite_inscription_a_partir_de = models.DateTimeField(blank=True, null=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="evenements_crees"
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return self.titre


class ResponsableBus(models.Model):
    """Membre chargé des bus d'un événement : il reçoit les paiements et valide les réservations."""

    evenement = models.ForeignKey(Evenement, on_delete=models.CASCADE, related_name="responsables_bus")
    membre = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="responsabilites_bus"
    )
    numero_wave = models.CharField(max_length=30, blank=True)
    numero_orange_money = models.CharField(max_length=30, blank=True)
    accepte_especes = models.BooleanField(default=True)

    class Meta:
        unique_together = ("evenement", "membre")
        ordering = ["id"]

    def __str__(self):
        return f"{self.membre} — {self.evenement}"


class ReservationBus(models.Model):
    """Réservation faite par un membre (ou par un responsable pour une personne sans téléphone)."""

    evenement = models.ForeignKey(Evenement, on_delete=models.CASCADE, related_name="reservations_bus")
    membre = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="reservations_bus"
    )
    # Personne à contacter quand la réservation est faite par un responsable pour quelqu'un sans compte.
    nom_contact = models.CharField(max_length=150, blank=True)
    telephone_contact = models.CharField(max_length=30, blank=True)
    acceptee = models.BooleanField(default=False)
    acceptee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    annulee = models.BooleanField(default=False)
    annulee_le = models.DateTimeField(null=True, blank=True)
    creee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    date_reservation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date_reservation"]

    def __str__(self):
        return f"{self.titulaire_nom} — {self.evenement}"

    @property
    def titulaire_nom(self):
        return self.membre.nom_complet if self.membre_id else self.nom_contact

    @property
    def titulaire_telephone(self):
        return self.membre.telephone if self.membre_id else self.telephone_contact


class PassagerBus(models.Model):
    """Une place réservée : le nom de la personne qui voyage et le bus attribué automatiquement."""

    reservation = models.ForeignKey(ReservationBus, on_delete=models.CASCADE, related_name="passagers")
    nom = models.CharField(max_length=150)
    est_titulaire = models.BooleanField(default=False)
    bus_numero = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["bus_numero", "id"]

    def __str__(self):
        return f"{self.nom} (bus {self.bus_numero})"


class PaiementBus(models.Model):
    """Paiement déclaré par le membre (puis validé ou refusé par un responsable), ou enregistré par un responsable."""

    class Moyen(models.TextChoices):
        WAVE = "wave", "Wave"
        ORANGE_MONEY = "orange_money", "Orange Money"
        ESPECES = "especes", "Espèces"

    class Statut(models.TextChoices):
        A_VERIFIER = "a_verifier", "À vérifier"
        VALIDE = "valide", "Validé"
        REFUSE = "refuse", "Refusé"

    reservation = models.ForeignKey(ReservationBus, on_delete=models.CASCADE, related_name="paiements")
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    moyen = models.CharField(max_length=20, choices=Moyen.choices)
    reference = models.CharField(max_length=100, blank=True)
    note = models.CharField(max_length=255, blank=True)
    # À qui l'argent a été remis.
    responsable = models.ForeignKey(
        ResponsableBus, on_delete=models.SET_NULL, null=True, blank=True, related_name="paiements"
    )
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.A_VERIFIER)
    declare_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    declare_le = models.DateTimeField(auto_now_add=True)
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    traite_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-declare_le"]

    def __str__(self):
        return f"{self.montant} ({self.get_moyen_display()}) — {self.get_statut_display()}"


class EnvoiAnnonce(models.Model):
    """Un e-mail d'annonce envoyé à un membre (évite les doublons et permet de reprendre le lendemain)."""

    evenement = models.ForeignKey(Evenement, on_delete=models.CASCADE, related_name="envois_annonce")
    membre = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    envoye_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("evenement", "membre")
