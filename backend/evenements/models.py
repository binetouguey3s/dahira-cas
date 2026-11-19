from django.conf import settings
from django.db import models


class Evenement(models.Model):
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
    visibilite_inscription_a_partir_de = models.DateTimeField(blank=True, null=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="evenements_crees"
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return self.titre


class ReservationBus(models.Model):
    evenement = models.ForeignKey(Evenement, on_delete=models.CASCADE, related_name="reservations_bus")
    membre = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations_bus"
    )
    bus_numero = models.PositiveSmallIntegerField()
    nb_places = models.PositiveSmallIntegerField(default=1)
    date_reservation = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("evenement", "membre")

    def __str__(self):
        return f"{self.membre} — Bus {self.bus_numero} ({self.evenement})"
