from rest_framework import permissions, viewsets

from .models import Cotisation
from .serializers import CotisationSerializer


class EstResponsableFinanceOuProprietaire(permissions.BasePermission):
    """Un membre ne voit que ses propres cotisations ; le responsable Finance / admin général voit tout."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.role in ("responsable_finance", "admin_general") or request.user.is_staff:
            return True
        return obj.membre_id == request.user.id


class CotisationViewSet(viewsets.ModelViewSet):
    serializer_class = CotisationSerializer
    permission_classes = [EstResponsableFinanceOuProprietaire]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("responsable_finance", "admin_general") or user.is_staff:
            return Cotisation.objects.all()
        return Cotisation.objects.filter(membre=user)
