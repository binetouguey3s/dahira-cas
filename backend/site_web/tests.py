from unittest import mock

from django.test import override_settings
from rest_framework.test import APITestCase

from comptes.tests_utils import creer_membre
from site_web.models import Traduction

TRAD = "/api/site/traduire/"


class ParametresTests(APITestCase):
    def test_lecture_publique_ecriture_reservee(self):
        self.assertEqual(self.client.get("/api/site/parametres/").status_code, 200)
        self.client.force_authenticate(creer_membre("+221770000091"))
        self.assertEqual(self.client.patch("/api/site/parametres/", {"citation_du_jour": "x"}).status_code, 403)
        self.client.force_authenticate(creer_membre("+221770000092", role="admin_contenus"))
        res = self.client.patch("/api/site/parametres/", {"citation_du_jour": "La foi"})
        self.assertEqual(res.data["citation_du_jour"], "La foi")


class TraductionTests(APITestCase):
    @override_settings(DEEPL_API_KEY="")
    def test_sans_cle_renvoie_les_textes_dorigine(self):
        res = self.client.post(TRAD, {"textes": ["Bonjour"], "langue": "en"}, format="json")
        self.assertEqual(res.data, {"traductions": ["Bonjour"], "active": False})

    @override_settings(DEEPL_API_KEY="cle:fx")
    def test_traduit_une_seule_fois_puis_utilise_la_memoire(self):
        with mock.patch("site_web.traduction._appeler_deepl", return_value=["Hello"]) as deepl:
            for _ in range(2):
                res = self.client.post(TRAD, {"textes": ["Bonjour", "Bonjour"], "langue": "en"}, format="json")
                self.assertEqual(res.data["traductions"], ["Hello", "Hello"])
        deepl.assert_called_once_with(["Bonjour"], "en")
        self.assertEqual(Traduction.objects.count(), 1)

    @override_settings(DEEPL_API_KEY="cle:fx")
    def test_panne_du_service_renvoie_loriginal(self):
        import urllib.error

        with mock.patch("site_web.traduction._appeler_deepl", side_effect=urllib.error.URLError("panne")):
            res = self.client.post(TRAD, {"textes": ["Bonjour"], "langue": "es"}, format="json")
        self.assertEqual(res.data["traductions"], ["Bonjour"])

    def test_langue_inconnue_refusee(self):
        self.assertEqual(self.client.post(TRAD, {"textes": ["x"], "langue": "de"}, format="json").status_code, 400)
