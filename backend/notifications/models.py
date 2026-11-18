from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Journal des notifications envoyées (déclenchées par n8n ou Django)."""

    class Type(models.TextChoices):
        RAPPEL_COTISATION = "rappel_cotisation", "Rappel de cotisation"
        NOUVEL_EVENEMENT = "nouvel_evenement", "Nouvel événement"
        REPONSE_OUSTAZ = "reponse_oustaz", "Réponse de l'Oustaz"

    class Canal(models.TextChoices):
        EMAIL = "email", "Email"
        WHATSAPP = "whatsapp", "WhatsApp"

    class StatutEnvoi(models.TextChoices):
        ENVOYE = "envoye", "Envoyé"
        ECHOUE = "echoue", "Échoué"
        EN_ATTENTE = "en_attente", "En attente"

    membre = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=30, choices=Type.choices)
    canal = models.CharField(max_length=10, choices=Canal.choices)
    contenu = models.TextField(blank=True)
    statut_envoi = models.CharField(
        max_length=15, choices=StatutEnvoi.choices, default=StatutEnvoi.EN_ATTENTE
    )
    date_envoi = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_envoi"]

    def __str__(self):
        return f"{self.get_type_display()} → {self.membre} ({self.canal})"
