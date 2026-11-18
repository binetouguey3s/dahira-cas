from django.conf import settings
from django.db import models


class Question(models.Model):
    class Theme(models.TextChoices):
        JEUNE_RAMADAN = "jeune_ramadan", "Jeûne & Ramadan"
        ZAKAT = "zakat", "Zakat"
        VIE_DAHIRA = "vie_dahira", "Vie du Dahira"
        AUTRE = "autre", "Autre"

    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        REPONDU = "repondu", "Répondu"

    membre = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="questions"
    )
    theme = models.CharField(max_length=20, choices=Theme.choices, default=Theme.AUTRE)
    texte = models.TextField(blank=True)
    audio = models.FileField(upload_to="questions/audio/", blank=True, null=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_creation"]

    def __str__(self):
        return f"{self.membre} — {self.get_theme_display()}"


class Reponse(models.Model):
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name="reponse")
    repondant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="reponses"
    )
    texte = models.TextField(blank=True)
    audio = models.FileField(upload_to="reponses/audio/", blank=True, null=True)
    date_publication = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Réponse à : {self.question}"
