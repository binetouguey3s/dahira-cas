import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q


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
        ES = "es", "Español"
        AR = "ar", "العربية"

    nom_complet = models.CharField(max_length=150)
    # Unique quand il est renseigné ; vide possible pour un membre sans compte (sans téléphone).
    telephone = models.CharField(max_length=20, blank=True)
    profession = models.CharField(max_length=120, blank=True)
    adresse = models.CharField(max_length=255, blank=True)
    pays = models.CharField(max_length=80, blank=True, default="SN")  # code ISO 3166 (SN, FR…)
    photo = models.ImageField(upload_to="membres/photos/", blank=True, null=True)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.MEMBRE)
    langue_preferee = models.CharField(max_length=5, choices=Langue.choices, default=Langue.FR)
    carte_numero = models.CharField(max_length=30, unique=True, blank=True)
    date_inscription = models.DateTimeField(auto_now_add=True)
    # Annonces des événements par e-mail (le membre peut les couper dans son profil).
    recevoir_annonces = models.BooleanField(default=True)
    # Membre ajouté par la Finance (ou l'administration) sans compte sur la plateforme : il a ses
    # cotisations mais ne se connecte pas. S'il s'inscrit plus tard avec ce numéro, son historique est gardé.
    sans_compte = models.BooleanField(default=False)

    REQUIRED_FIELDS = ["email"]

    class Meta(AbstractUser.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["telephone"], condition=~Q(telephone=""), name="telephone_unique_si_renseigne"
            )
        ]

    def save(self, *args, **kwargs):
        if not self.carte_numero:
            self.carte_numero = self._nouveau_numero_carte()
        # Un super-administrateur Django a d'office le rôle le plus élevé sur le site.
        if self.is_superuser and self.role == self.Role.MEMBRE:
            self.role = self.Role.ADMIN_GENERAL
        super().save(*args, **kwargs)

    @classmethod
    def _nouveau_numero_carte(cls) -> str:
        while True:
            numero = f"FDCAS-{uuid.uuid4().int % 1000000:06d}"
            if not cls.objects.filter(carte_numero=numero).exists():
                return numero

    def __str__(self):
        return self.nom_complet or self.username
