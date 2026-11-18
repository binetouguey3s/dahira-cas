from django.contrib import admin

from .models import ContenuMedia


@admin.register(ContenuMedia)
class ContenuMediaAdmin(admin.ModelAdmin):
    list_display = ("titre", "type", "auteur", "date_publication", "nb_likes")
    list_filter = ("type",)
    search_fields = ("titre", "auteur")
