from django.contrib import admin

from .models import Question, Reponse


class ReponseInline(admin.StackedInline):
    model = Reponse
    extra = 0


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("membre", "theme", "statut", "date_creation")
    list_filter = ("theme", "statut")
    inlines = [ReponseInline]
