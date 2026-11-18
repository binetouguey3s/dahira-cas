from comptes.models import Membre

MOT_DE_PASSE = "MotDePasse!2026"


def creer_membre(tel, role="membre", **kwargs):
    return Membre.objects.create_user(
        username=tel, telephone=tel, nom_complet=f"Membre {tel}", password=MOT_DE_PASSE, role=role, **kwargs
    )
