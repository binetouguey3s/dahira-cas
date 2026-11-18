from django.urls import path

from .views import ParametresView, TraductionView

urlpatterns = [
    path("parametres/", ParametresView.as_view(), name="parametres"),
    path("traduire/", TraductionView.as_view(), name="traduire"),
]
