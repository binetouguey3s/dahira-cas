from rest_framework import permissions, viewsets

from .models import Evenement, ReservationBus
from .serializers import EvenementSerializer, ReservationBusSerializer


class EstAdminOuLectureSeule(permissions.BasePermission):
    """Lecture ouverte à tous ; création/modification réservée aux rôles admin."""

    ROLES_AUTORISES = ("admin_contenus", "admin_general")

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.role in self.ROLES_AUTORISES)
        )


class EvenementViewSet(viewsets.ModelViewSet):
    queryset = Evenement.objects.all()
    serializer_class = EvenementSerializer
    permission_classes = [EstAdminOuLectureSeule]

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class ReservationBusViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationBusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin_general" or user.is_staff:
            return ReservationBus.objects.all()
        return ReservationBus.objects.filter(membre=user)

    def perform_create(self, serializer):
        serializer.save(membre=self.request.user)
