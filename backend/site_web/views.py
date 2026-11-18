from django.conf import settings
from rest_framework import permissions
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from comptes.permissions import ROLES_CONTENUS, a_un_role

from .models import Parametres
from .serializers import ParametresSerializer, TraductionSerializer
from .traduction import traduire


class ParametresView(APIView):
    """GET (public) / PATCH (admins contenus) /api/site/parametres/."""

    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method == "GET" else [permissions.IsAuthenticated()]

    def get(self, request):
        return Response(ParametresSerializer(Parametres.charger(), context={"request": request}).data)

    def patch(self, request):
        if not a_un_role(request.user, ROLES_CONTENUS):
            return Response({"detail": "Accès réservé."}, status=403)
        serializer = ParametresSerializer(
            Parametres.charger(), data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class TraductionView(APIView):
    """POST /api/site/traduire/ — {textes: [...], langue: "en"} → {traductions: [...], active: bool}."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "traduction"

    def post(self, request):
        serializer = TraductionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        textes = serializer.validated_data["textes"]
        langue = serializer.validated_data["langue"]
        return Response({"traductions": traduire(textes, langue), "active": bool(settings.DEEPL_API_KEY)})
