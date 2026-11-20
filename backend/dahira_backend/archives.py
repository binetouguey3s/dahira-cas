"""Archives : « supprimer » met d'abord un élément aux archives.

Depuis les archives, un administrateur peut le restaurer ou le supprimer définitivement.
Un élément archivé n'apparaît plus nulle part ailleurs sur le site.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from comptes.permissions import a_un_role


class Archivable(models.Model):
    archive_le = models.DateTimeField(null=True, blank=True, db_index=True)
    archive_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        abstract = True


class ArchivesMixin:
    """À placer avant ModelViewSet. `roles_archives` : rôles autorisés à voir les archives,
    restaurer et supprimer définitivement. Les vues appellent `filtrer_archives(qs)` dans get_queryset."""

    roles_archives: tuple = ()
    ACTIONS_ARCHIVES = ("restaurer", "definitif")

    def peut_archiver(self):
        return a_un_role(self.request.user, self.roles_archives)

    def voir_archives(self):
        return self.action in self.ACTIONS_ARCHIVES or (
            self.request.query_params.get("archives") == "1" and self.action in ("list", "retrieve")
        )

    def filtrer_archives(self, qs):
        if self.voir_archives():
            if not self.peut_archiver():
                return qs.none()
            return qs.filter(archive_le__isnull=False).order_by("-archive_le")
        return qs.filter(archive_le__isnull=True)

    def perform_destroy(self, instance):
        instance.archive_le = timezone.now()
        instance.archive_par = self.request.user
        instance.save(update_fields=["archive_le", "archive_par"])

    def supprimer_definitivement(self, instance):
        instance.delete()

    def _exiger_droit(self):
        if not self.peut_archiver():
            raise PermissionDenied("Réservé à l'administration.")

    @action(detail=True, methods=["post"])
    def restaurer(self, request, pk=None):
        self._exiger_droit()
        instance = self.get_object()
        instance.archive_le = None
        instance.archive_par = None
        instance.save(update_fields=["archive_le", "archive_par"])
        return Response({"detail": "Restauré."})

    @action(detail=True, methods=["delete"])
    def definitif(self, request, pk=None):
        self._exiger_droit()
        self.supprimer_definitivement(self.get_object())
        return Response(status=204)
