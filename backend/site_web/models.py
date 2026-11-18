import hashlib

from django.db import models


class Parametres(models.Model):
    """Contenus du site modifiables depuis l'interface (une seule ligne en base)."""

    nom_dahira = models.CharField(max_length=150, default="Dahira Cheikh Abdoulahi Seye")
    sigle = models.CharField(max_length=30, default="FDCAS")
    logo = models.ImageField(upload_to="site/", blank=True, null=True)
    nom_guide = models.CharField(max_length=150, default="Cheikh Abdoulahi Seye")
    titre_guide = models.CharField(max_length=200, blank=True, default="Guide religieux")
    photo_guide = models.ImageField(upload_to="site/", blank=True, null=True)
    biographie_parcours = models.TextField(blank=True)
    biographie_vision = models.TextField(blank=True)
    biographie_enseignements = models.TextField(blank=True)
    citation_du_jour = models.TextField(blank=True)
    citation_auteur = models.CharField(max_length=150, blank=True)
    telephone_contact = models.CharField(max_length=30, blank=True)
    email_contact = models.EmailField(blank=True)
    adresse = models.CharField(max_length=255, blank=True)
    montant_cotisation = models.DecimalField(max_digits=10, decimal_places=2, default=1000)
    numero_wave = models.CharField(max_length=30, blank=True)
    numero_orange_money = models.CharField(max_length=30, blank=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paramètres du site"
        verbose_name_plural = "Paramètres du site"

    def __str__(self):
        return "Paramètres du site"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def charger(cls):
        objet, _ = cls.objects.get_or_create(pk=1)
        return objet


class Traduction(models.Model):
    """Mémoire des traductions automatiques : chaque texte n'est traduit qu'une fois par langue."""

    empreinte = models.CharField(max_length=64)
    langue = models.CharField(max_length=5)
    texte_source = models.TextField()
    texte_traduit = models.TextField()
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["empreinte", "langue"], name="traduction_unique")]

    @staticmethod
    def calculer_empreinte(texte: str) -> str:
        return hashlib.sha256(texte.encode("utf-8")).hexdigest()
