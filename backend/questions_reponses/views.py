from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Question, Reponse
from .serializers import QuestionSerializer, ReponseSerializer


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related("reponse").all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(membre=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def repondre(self, request, pk=None):
        """POST /api/questions-reponses/questions/{id}/repondre/ — réservé à l'Oustaz / Admin."""
        question = self.get_object()
        if request.user.role not in ("oustaz", "admin_general") and not request.user.is_staff:
            return Response({"detail": "Réservé à l'Oustaz."}, status=403)
        serializer = ReponseSerializer(data={**request.data, "question": question.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(repondant=request.user)
        question.statut = Question.Statut.REPONDU
        question.save(update_fields=["statut"])
        return Response(serializer.data, status=201)
