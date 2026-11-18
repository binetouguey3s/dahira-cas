from django.db import models

from evenements.models import Evenement


class ContenuMedia(models.Model):
    class TypeContenu(models.TextChoices):
        AUDIO = "audio", "Audio"
        VIDEO = "video", "Vidéo"
        TEXTE = "texte", "Texte"

    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=10, choices=TypeContenu.choices)
    fichier = models.FileField(upload_to="mediatheque/", blank=True, null=True)
    url_externe = models.URLField(blank=True, help_text="Lien YouTube ou autre, si pas d'upload direct")
    auteur = models.CharField(max_length=150, help_text="Ex. Cheikh Abdoulahi Seye, Oustaz Modou Diagne")
    evenement = models.ForeignKey(
        Evenement, on_delete=models.SET_NULL, null=True, blank=True, related_name="contenus"
    )
    nb_likes = models.PositiveIntegerField(default=0)
    nb_telechargements = models.PositiveIntegerField(default=0)
    date_publication = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_publication"]

    def __str__(self):
        return self.titre
