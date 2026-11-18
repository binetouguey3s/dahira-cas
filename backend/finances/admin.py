from django.contrib import admin

from .models import Cotisation


@admin.register(Cotisation)
class CotisationAdmin(admin.ModelAdmin):
    list_display = ("membre", "mois", "annee", "montant", "statut", "moyen_paiement")
    list_filter = ("statut", "moyen_paiement", "annee")
    search_fields = ("membre__nom_complet", "membre__telephone")
