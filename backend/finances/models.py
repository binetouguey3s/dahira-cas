from django.conf import settings
from django.db import models


class Cotisation(models.Model):
    class Statut(models.TextChoices):
        PAYE = "paye", "Payé"
        EN_RETARD = "en_retard", "En retard"
        NON_PAYE = "non_paye", "Non payé"

    class MoyenPaiement(models.TextChoices):
        WAVE = "wave", "Wave"
        ORANGE_MONEY = "orange_money", "Orange Money"
        AUTRE = "autre", "Autre"

    membre = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cotisations"
    )
    mois = models.PositiveSmallIntegerField()
    annee = models.PositiveSmallIntegerField()
    montant = models.DecimalField(max_digits=10, decimal_places=2, default=1000)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.NON_PAYE)
    moyen_paiement = models.CharField(
        max_length=20, choices=MoyenPaiement.choices, blank=True
    )
    reference_transaction = models.CharField(max_length=100, blank=True)
    date_paiement = models.DateTimeField(blank=True, null=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("membre", "mois", "annee")
        ordering = ["-annee", "-mois"]

    def __str__(self):
        return f"{self.membre} — {self.mois}/{self.annee} ({self.statut})"
