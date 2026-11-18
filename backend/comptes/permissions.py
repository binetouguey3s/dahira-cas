"""Permissions par rôle, partagées par toutes les apps.

Un super-administrateur Django (is_staff) a toujours tous les droits.
"""

from rest_framework import permissions

ROLES_FINANCE = ("responsable_finance", "admin_general")
ROLES_CONTENUS = ("oustaz", "admin_contenus", "admin_general")
ROLES_EVENEMENTS = ("admin_contenus", "admin_general")
ROLES_OUSTAZ = ("oustaz", "admin_general")
ROLES_ADMIN_GENERAL = ("admin_general",)


def a_un_role(user, roles) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or getattr(user, "role", None) in roles)
    )


class RoleOuLectureSeule(permissions.BasePermission):
    """Lecture ouverte à tous ; écriture réservée aux rôles listés dans `roles`."""

    roles: tuple = ()

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return a_un_role(request.user, self.roles)


class Role(permissions.BasePermission):
    """Accès (lecture et écriture) réservé aux rôles listés dans `roles`."""

    roles: tuple = ()

    def has_permission(self, request, view):
        return a_un_role(request.user, self.roles)


def role_ou_lecture_seule(*roles):
    return type("RoleOuLectureSeule", (RoleOuLectureSeule,), {"roles": roles})


def role_requis(*roles):
    return type("RoleRequis", (Role,), {"roles": roles})
