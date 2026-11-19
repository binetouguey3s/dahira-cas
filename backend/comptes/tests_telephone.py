from django.core.cache import cache
from rest_framework.test import APITestCase

from comptes.telephone import normaliser_telephone
from comptes.tests_utils import MOT_DE_PASSE, creer_membre


class NormalisationTests(APITestCase):
    def test_formats_acceptes(self):
        for saisie in ["77 123 45 67", "+221 77 123 45 67", "00221771234567", "221771234567"[0:0] + "771234567"]:
            self.assertEqual(normaliser_telephone(saisie), "+221771234567", saisie)
        self.assertEqual(normaliser_telephone("+33 6 12 34 56 78"), "+33612345678")

    def test_numeros_invalides(self):
        for saisie in ["", "abc", "12", "+221 12"]:
            self.assertIsNone(normaliser_telephone(saisie), saisie)


class InscriptionEtConnexionTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_inscription_normalise_le_numero(self):
        res = self.client.post(
            "/api/comptes/inscription/",
            {"nom_complet": "Awa Ndiaye", "telephone": "77 555 44 33", "password": MOT_DE_PASSE},
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["membre"]["telephone"], "+221775554433")

    def test_inscription_numero_invalide(self):
        res = self.client.post(
            "/api/comptes/inscription/", {"nom_complet": "X", "telephone": "123", "password": MOT_DE_PASSE}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("telephone", res.data)

    def test_doublon_detecte_quel_que_soit_le_format(self):
        creer_membre("+221775554433")
        res = self.client.post(
            "/api/comptes/inscription/",
            {"nom_complet": "Doublon", "telephone": "77 555 44 33", "password": MOT_DE_PASSE},
        )
        self.assertEqual(res.status_code, 400)

    def test_connexion_sans_indicatif(self):
        creer_membre("+221775554433")
        res = self.client.post("/api/comptes/connexion/", {"username": "77 555 44 33", "password": MOT_DE_PASSE})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn("access", res.data)

    def test_connexion_par_identifiant_administrateur(self):
        from comptes.models import Membre

        Membre.objects.create_superuser(username="admin", telephone="", password=MOT_DE_PASSE, nom_complet="Admin")
        res = self.client.post("/api/comptes/connexion/", {"username": "admin", "password": MOT_DE_PASSE})
        self.assertEqual(res.status_code, 200)

    def test_trop_de_tentatives_bloquees(self):
        creer_membre("+221775554433")
        codes = [
            self.client.post("/api/comptes/connexion/", {"username": "775554433", "password": "faux"}).status_code
            for _ in range(12)
        ]
        self.assertEqual(codes[0], 401)
        self.assertEqual(codes[-1], 429)


class PaysTests(APITestCase):
    def test_code_pays(self):
        membre = creer_membre("+221775554433")
        self.client.force_authenticate(membre)
        self.assertEqual(self.client.patch("/api/comptes/moi/", {"pays": "fr"}).data["pays"], "FR")
        self.assertEqual(self.client.patch("/api/comptes/moi/", {"pays": "ZZ"}).status_code, 400)


class AnciensFormatsTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_compte_enregistre_sans_indicatif_et_homonyme_au_format_international(self):
        from comptes.models import Membre

        # Superutilisateur créé en ligne de commande avec « 776787711 », et un 2e compte « +221776787711 ».
        Membre.objects.create_superuser(username="776787711", telephone="776787711", password="SecretAdmin!2026", nom_complet="Admin")
        creer_membre("+221776787711")
        for saisie in ["+221776787711", "77 678 77 11", "776787711"]:
            admin = self.client.post("/api/comptes/connexion/", {"username": saisie, "password": "SecretAdmin!2026"})
            self.assertEqual(admin.status_code, 200, saisie)
            membre = self.client.post("/api/comptes/connexion/", {"username": saisie, "password": MOT_DE_PASSE})
            self.assertEqual(membre.status_code, 200, saisie)
        self.assertEqual(self.client.post("/api/comptes/connexion/", {"username": "776787711", "password": "faux"}).status_code, 401)
