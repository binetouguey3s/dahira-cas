from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("membre", "type", "canal", "statut_envoi", "date_envoi")
    list_filter = ("type", "canal", "statut_envoi")
