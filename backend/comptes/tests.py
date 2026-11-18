from rest_framework.test import APITestCase

from comptes.models import Membre

MOI = "/api/comptes/moi/"


class ProfilTests(APITestCase):
    def setUp(self):
        self.membre = Membre.objects.create_user(
            username="+221770000021", telephone="+221770000021", nom_complet="Awa Ndiaye", password="MotDePasse!2026"
        )
        self.client.force_authenticate(self.membre)

    def test_ne_peut_pas_changer_son_role(self):
        self.client.patch(MOI, {"role": "admin_general"})
        self.membre.refresh_from_db()
        self.assertEqual(self.membre.role, "membre")

    def test_changer_telephone_change_aussi_lidentifiant_de_connexion(self):
        res = self.client.patch(MOI, {"telephone": "+221770000099"})
        self.assertEqual(res.status_code, 200)
        self.membre.refresh_from_db()
        self.assertEqual(self.membre.username, "+221770000099")
        self.client.force_authenticate(None)
        res = self.client.post(
            "/api/comptes/connexion/", {"username": "+221770000099", "password": "MotDePasse!2026"}
        )
        self.assertEqual(res.status_code, 200)

    def test_ne_peut_pas_changer_username_directement(self):
        self.client.patch(MOI, {"username": "pirate"})
        self.membre.refresh_from_db()
        self.assertEqual(self.membre.username, "+221770000021")

    def test_telephone_deja_pris_refuse(self):
        Membre.objects.create_user(username="+221770000022", telephone="+221770000022", nom_complet="X", password="x")
        res = self.client.patch(MOI, {"telephone": "+221770000022"})
        self.assertEqual(res.status_code, 400)


class SuperAdminTests(APITestCase):
    def test_superuser_a_le_role_admin_general(self):
        su = Membre.objects.create_superuser(username="admin", email="a@a.sn", password="x", telephone="+221700000000")
        self.assertEqual(su.role, "admin_general")
