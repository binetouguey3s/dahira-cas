from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "membre", "type", "canal", "contenu", "statut_envoi", "date_envoi"]
        read_only_fields = ["id", "date_envoi"]
