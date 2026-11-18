from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Membre
from .serializers import InscriptionSerializer, MembreSerializer


class InscriptionView(generics.CreateAPIView):
    """POST /api/comptes/inscription/ — crée un membre et renvoie ses jetons JWT."""

    queryset = Membre.objects.all()
    serializer_class = InscriptionSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membre = serializer.save()
        refresh = RefreshToken.for_user(membre)
        return Response(
            {
                "membre": MembreSerializer(membre).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=201,
        )


class MoiView(APIView):
    """GET/PATCH /api/comptes/moi/ — profil du membre connecté."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(MembreSerializer(request.user).data)

    def patch(self, request):
        serializer = MembreSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
