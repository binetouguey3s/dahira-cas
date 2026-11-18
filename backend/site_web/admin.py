from django.contrib import admin

from .models import Parametres, Traduction

admin.site.register(Parametres)


@admin.register(Traduction)
class TraductionAdmin(admin.ModelAdmin):
    list_display = ("langue", "texte_source", "texte_traduit", "cree_le")
    list_filter = ("langue",)
    search_fields = ("texte_source", "texte_traduit")
