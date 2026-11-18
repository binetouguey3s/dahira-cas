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


import io

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from comptes.tests_utils import creer_membre


def image_test(nom="photo.jpg"):
    tampon = io.BytesIO()
    Image.new("RGB", (50, 50), "green").save(tampon, "JPEG")
    return SimpleUploadedFile(nom, tampon.getvalue(), content_type="image/jpeg")


class PhotoEtMotDePasseTests(APITestCase):
    def setUp(self):
        self.membre = creer_membre("+221770000031")
        self.client.force_authenticate(self.membre)

    def test_envoyer_puis_supprimer_sa_photo(self):
        res = self.client.patch(MOI, {"photo": image_test()}, format="multipart")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["photo"])
        res = self.client.delete("/api/comptes/moi/photo/")
        self.assertIsNone(res.data["photo"])

    def test_changer_mot_de_passe(self):
        res = self.client.post("/api/comptes/moi/mot-de-passe/", {"ancien": "faux", "nouveau": "NouveauMdp!2026"})
        self.assertEqual(res.status_code, 400)
        res = self.client.post(
            "/api/comptes/moi/mot-de-passe/", {"ancien": "MotDePasse!2026", "nouveau": "NouveauMdp!2026"}
        )
        self.assertEqual(res.status_code, 200)
        self.membre.refresh_from_db()
        self.assertTrue(self.membre.check_password("NouveauMdp!2026"))


class GestionMembresTests(APITestCase):
    def setUp(self):
        self.admin = creer_membre("+221770000041", role="admin_general")
        self.membre = creer_membre("+221770000042")
        self.finance = creer_membre("+221770000043", role="responsable_finance")

    def test_seul_ladmin_general_gere_les_membres(self):
        for qui in (self.membre, self.finance):
            self.client.force_authenticate(qui)
            self.assertEqual(self.client.get("/api/comptes/membres/").status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get("/api/comptes/membres/").data["count"], 3)

    def test_admin_change_un_role_et_desactive(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/comptes/membres/{self.membre.id}/", {"role": "oustaz", "is_active": False})
        self.assertEqual(res.status_code, 200)
        self.membre.refresh_from_db()
        self.assertEqual((self.membre.role, self.membre.is_active), ("oustaz", False))

    def test_admin_ne_peut_pas_se_retirer_ses_droits(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"/api/comptes/membres/{self.admin.id}/", {"role": "membre"})
        self.assertEqual(res.status_code, 400)

    def test_reinitialiser_mot_de_passe(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/comptes/membres/{self.membre.id}/reinitialiser-mot-de-passe/")
        self.membre.refresh_from_db()
        self.assertTrue(self.membre.check_password(res.data["mot_de_passe_provisoire"]))

    def test_annuaire_reserve_a_la_finance(self):
        self.client.force_authenticate(self.membre)
        self.assertEqual(self.client.get("/api/comptes/annuaire/").status_code, 403)
        self.client.force_authenticate(self.finance)
        self.assertEqual(len(self.client.get("/api/comptes/annuaire/").data), 3)


class CarteTests(APITestCase):
    def test_verification_publique_sans_donnees_sensibles(self):
        membre = creer_membre("+221770000051")
        res = self.client.get(f"/api/comptes/carte/{membre.carte_numero}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["nom_complet"], membre.nom_complet)
        self.assertNotIn("telephone", res.data)
        self.assertEqual(self.client.get("/api/comptes/carte/INCONNU/").status_code, 404)
