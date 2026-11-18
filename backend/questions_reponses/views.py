from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from comptes.permissions import ROLES_OUSTAZ, a_un_role

from .models import Question
from .serializers import QuestionSerializer, ReponseSerializer


class QuestionViewSet(viewsets.ModelViewSet):
    """Chaque membre ne voit et ne gère que SES questions.

    L'Oustaz et l'Administrateur général voient toutes les questions et y répondent.
    Un membre ne peut plus modifier sa question une fois qu'on y a répondu.
    """

    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["statut", "theme"]
    search_fields = ["texte", "membre__nom_complet"]
    ordering_fields = ["date_creation", "statut"]

    def get_queryset(self):
        qs = Question.objects.select_related("reponse", "membre")
        if a_un_role(self.request.user, ROLES_OUSTAZ):
            return qs
        return qs.filter(membre=self.request.user)

    def perform_create(self, serializer):
        serializer.save(membre=self.request.user)

    def _verifier_modifiable(self, question):
        if a_un_role(self.request.user, ROLES_OUSTAZ):
            return
        if question.statut == Question.Statut.REPONDU:
            raise PermissionDenied("Cette question a déjà reçu une réponse.")

    def perform_update(self, serializer):
        self._verifier_modifiable(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_modifiable(instance)
        instance.delete()

    @action(detail=True, methods=["post"])
    def repondre(self, request, pk=None):
        """POST /api/questions-reponses/questions/{id}/repondre/ — réservé à l'Oustaz / Admin général.

        Si la question a déjà une réponse, celle-ci est mise à jour.
        """
        if not a_un_role(request.user, ROLES_OUSTAZ):
            return Response({"detail": "Réservé à l'Oustaz."}, status=403)
        question = self.get_object()
        existante = getattr(question, "reponse", None)
        donnees = {"question": question.id, "texte": request.data.get("texte", "")}
        if "audio" in request.data:
            donnees["audio"] = request.data.get("audio")
        serializer = ReponseSerializer(existante, data=donnees)
        serializer.is_valid(raise_exception=True)
        serializer.save(repondant=request.user)
        question.statut = Question.Statut.REPONDU
        question.save(update_fields=["statut"])
        return Response(serializer.data, status=200 if existante else 201)
