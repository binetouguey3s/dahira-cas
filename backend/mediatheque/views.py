from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ContenuMedia
from .serializers import ContenuMediaSerializer


class EstAdminContenuOuLectureSeule(permissions.BasePermission):
    """Lecture ouverte à tous ; création/modification réservée à l'Oustaz et aux admins contenus."""

    ROLES_AUTORISES = ("oustaz", "admin_contenus", "admin_general")

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.role in self.ROLES_AUTORISES)
        )


class ContenuMediaViewSet(viewsets.ModelViewSet):
    queryset = ContenuMedia.objects.all()
    serializer_class = ContenuMediaSerializer
    permission_classes = [EstAdminContenuOuLectureSeule]
    filterset_fields = ["type", "evenement"]

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def aimer(self, request, pk=None):
        """POST /api/mediatheque/contenus/{id}/aimer/ — incrémente le compteur de likes."""
        contenu = self.get_object()
        contenu.nb_likes += 1
        contenu.save(update_fields=["nb_likes"])
        return Response({"nb_likes": contenu.nb_likes})

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def telecharger(self, request, pk=None):
        """POST /api/mediatheque/contenus/{id}/telecharger/ — incrémente le compteur de téléchargements."""
        contenu = self.get_object()
        contenu.nb_telechargements += 1
        contenu.save(update_fields=["nb_telechargements"])
        return Response({"nb_telechargements": contenu.nb_telechargements})
