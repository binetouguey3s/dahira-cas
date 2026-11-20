from django.db import models

from dahira_backend.archives import Archivable

from dahira_backend.stockage import stockage_audio_video

from evenements.models import Evenement


class ContenuMedia(Archivable):
    class TypeContenu(models.TextChoices):
        AUDIO = "audio", "Audio"
        VIDEO = "video", "Vidéo"
        TEXTE = "texte", "Texte"

    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=10, choices=TypeContenu.choices)
    fichier = models.FileField(upload_to="mediatheque/", storage=stockage_audio_video, blank=True, null=True)
    url_externe = models.URLField(blank=True, help_text="Lien YouTube ou autre, si pas d'upload direct")
    auteur = models.CharField(max_length=150, help_text="Ex. Cheikh Abdoulahi Seye, Oustaz Modou Diagne")
    # Même liste que les événements (Magal, Gamou, Nisfou Shabaan…) ; « autre » + précision libre.
    categorie = models.CharField(max_length=20, choices=Evenement.Categorie.choices, blank=True)
    categorie_autre = models.CharField(max_length=80, blank=True)
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


class Like(models.Model):
    """Un membre ne peut aimer un contenu qu'une seule fois."""

    contenu = models.ForeignKey(ContenuMedia, on_delete=models.CASCADE, related_name="likes")
    membre = models.ForeignKey("comptes.Membre", on_delete=models.CASCADE, related_name="likes")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["contenu", "membre"], name="like_unique_par_membre")]
