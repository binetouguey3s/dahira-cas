from django.contrib import admin

from .models import Evenement, ReservationBus


class ReservationBusInline(admin.TabularInline):
    model = ReservationBus
    extra = 0


@admin.register(Evenement)
class EvenementAdmin(admin.ModelAdmin):
    list_display = ("titre", "categorie", "date", "reservation_bus_active")
    list_filter = ("categorie",)
    search_fields = ("titre",)
    inlines = [ReservationBusInline]


@admin.register(ReservationBus)
class ReservationBusAdmin(admin.ModelAdmin):
    list_display = ("evenement", "membre", "nom_contact", "acceptee", "annulee")
