from rest_framework import permissions, viewsets

from .models import Notification
from .serializers import NotificationSerializer


class EstAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_staff or user.role == "admin_general"))


class NotificationViewSet(viewsets.ModelViewSet):
    """Journal des notifications. Alimenté par les workflows n8n (voir README) ou par le backend."""

    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [EstAdmin]
