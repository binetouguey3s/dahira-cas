from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Membre


@admin.register(Membre)
class MembreAdmin(UserAdmin):
    list_display = ("username", "nom_complet", "telephone", "role", "carte_numero", "is_staff")
    list_filter = ("role", "langue_preferee", "is_staff")
    fieldsets = UserAdmin.fieldsets + (
        (
            "Profil Dahira",
            {
                "fields": (
                    "nom_complet",
                    "telephone",
                    "profession",
                    "adresse",
                    "pays",
                    "photo",
                    "role",
                    "langue_preferee",
                    "carte_numero",
                )
            },
        ),
    )
