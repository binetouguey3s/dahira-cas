import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class Membre(AbstractUser):
    """Utilisateur de la plateforme : membre du Dahira ou responsable admin."""

    class Role(models.TextChoices):
        MEMBRE = "membre", "Membre"
        RESPONSABLE_FINANCE = "responsable_finance", "Responsable Finance"
        OUSTAZ = "oustaz", "Oustaz"
        ADMIN_CONTENUS = "admin_contenus", "Administrateur contenus"
        ADMIN_GENERAL = "admin_general", "Administrateur général"

    class Langue(models.TextChoices):
        FR = "fr", "Français"
        EN = "en", "English"
        AR = "ar", "العربية"

    nom_complet = models.CharField(max_length=150)
    telephone = models.CharField(max_length=20, unique=True)
    profession = models.CharField(max_length=120, blank=True)
    adresse = models.CharField(max_length=255, blank=True)
    pays = models.CharField(max_length=80, default="Sénégal")
    photo = models.ImageField(upload_to="membres/photos/", blank=True, null=True)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.MEMBRE)
    langue_preferee = models.CharField(max_length=5, choices=Langue.choices, default=Langue.FR)
    carte_numero = models.CharField(max_length=30, unique=True, blank=True)
    date_inscription = models.DateTimeField(auto_now_add=True)

    REQUIRED_FIELDS = ["email"]

    def save(self, *args, **kwargs):
        if not self.carte_numero:
            self.carte_numero = f"FDCAS-{uuid.uuid4().int % 100000:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom_complet or self.username
