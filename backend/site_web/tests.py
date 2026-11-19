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


from django.core.files.uploadedfile import SimpleUploadedFile  # noqa: E402

from comptes.tests_utils import creer_membre  # noqa: E402


class VideoGuideTests(APITestCase):
    URL = "/api/site/parametres/"

    def setUp(self):
        self.admin = creer_membre("+221770000901", role="admin_contenus")
        self.client.force_authenticate(self.admin)

    def test_lien_video_et_affichage_accueil(self):
        res = self.client.patch(
            self.URL, {"video_guide_lien": "https://youtu.be/abc123", "video_guide_accueil": True}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        public = self.client.get(self.URL).data
        self.assertEqual(public["video_guide_lien"], "https://youtu.be/abc123")
        self.assertTrue(public["video_guide_accueil"])

    def test_lien_non_web_refuse(self):
        res = self.client.patch(self.URL, {"video_guide_lien": "javascript:alert(1)"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_fichier_video_puis_suppression(self):
        video = SimpleUploadedFile("guide.mp4", b"\x00" * 2000, content_type="video/mp4")
        res = self.client.patch(self.URL, {"video_guide": video}, format="multipart")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["video_guide"])
        res = self.client.patch(self.URL, {"supprimer_video_guide": "1"}, format="multipart")
        self.assertIsNone(res.data["video_guide"])

    def test_fichier_non_video_refuse(self):
        faux = SimpleUploadedFile("x.pdf", b"%PDF", content_type="application/pdf")
        self.assertEqual(self.client.patch(self.URL, {"video_guide": faux}, format="multipart").status_code, 400)

    def test_simple_membre_ne_peut_pas_modifier(self):
        self.client.force_authenticate(creer_membre("+221770000902"))
        self.assertEqual(self.client.patch(self.URL, {"video_guide_lien": "https://youtu.be/x"}, format="json").status_code, 403)


class TermesProtegesTests(APITestCase):
    def test_termes_religieux_non_traduits(self):
        from site_web.traduction import deproteger, proteger

        for texte in ["Magal de Touba", "Nisfou Shabaan", "Leylatul Khadr", "Cheikh Abdoulahi Seye", "Setaané, Gnétaané"]:
            self.assertEqual(proteger(texte), f"<x>{texte}</x>")
            self.assertEqual(deproteger(proteger(texte)), texte)
        # Vers l'arabe : forme arabe usuelle remise après traduction, sinon le terme reste tel quel.
        self.assertEqual(deproteger("الاستعداد لـ<x>Leylatul Khadr</x> مع الـ<x>Dahira</x>", "ar"), "الاستعداد لليلة القدر مع الدائرة")
        self.assertEqual(deproteger("<x>Magal de Touba</x>", "ar"), "ماغال طوبى")
        self.assertEqual(deproteger("يذكّر <x>Cheikh Abdoulahi Seye</x>: <x>Setaané, Gnétaané</x>", "ar"), "يذكّر الشيخ عبد الله سي: Setaané, Gnétaané")
        self.assertEqual(deproteger("<x>Magal de Touba</x>", "en"), "Magal de Touba")
        self.assertEqual(deproteger("التحضير لليلة <x>Leylatul Khadr</x>", "ar"), "التحضير لليلة القدر")
        self.assertEqual(deproteger("ليلة<x>Nisfou Shabaan</x>", "ar"), "ليلة النصف من شعبان")
        self.assertEqual(proteger("a < b & c"), "a &lt; b &amp; c")


class SanteTests(APITestCase):
    def test_sante_sans_base_de_donnees(self):
        with self.assertNumQueries(0):
            res = self.client.get("/api/sante/")
        self.assertEqual(res.json(), {"ok": True})
