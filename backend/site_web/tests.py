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
        self.assertEqual(res.data, {"traductions": ["Bonjour"], "active": False, "version": "v6-0"})

    @override_settings(DEEPL_API_KEY="cle:fx")
    def test_traduit_une_seule_fois_puis_utilise_la_memoire(self):
        with mock.patch("site_web.traduction._appeler_deepl", return_value=["Hello"]) as deepl:
            for _ in range(2):
                res = self.client.post(TRAD, {"textes": ["Bonjour", "Bonjour"], "langue": "en"}, format="json")
                self.assertEqual(res.data["traductions"], ["Hello", "Hello"])
        deepl.assert_called_once_with(["Bonjour"], "en", ())
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


class NomsPropresEtAnneesTests(APITestCase):
    """Adresses, noms propres et années restent tels quels."""

    def test_adresses_et_noms_proteges(self):
        from site_web.traduction import proteger

        self.assertEqual(proteger("Rendez-vous à Keur Ndiaye Lo"), "Rendez-vous à <x>Keur Ndiaye Lo</x>")
        self.assertIn("<x>Kourel</x>", proteger("Le Kourel chantera"))
        self.assertIn("<x>Moussa</x> <x>Fall</x>", proteger("Accueil par Moussa Fall"))
        # Sans majuscule, ce n'est pas un nom : « fall » reste un mot ordinaire.
        self.assertNotIn("<x>", proteger("the leaves fall"))
        self.assertIn("<x>Darou Salam</x>", proteger("Départ de Darou Salam"))

    def test_mots_personnalises(self):
        from site_web.traduction import proteger

        self.assertEqual(proteger("Chez la famille Seck Bou", ("Seck Bou",)), "Chez la famille <x>Seck Bou</x>")

    def test_annee_sans_mot_ajoute(self):
        from site_web.traduction import deproteger, proteger

        self.assertEqual(proteger("Magal 2026"), "<x>Magal</x> <x>2026</x>")
        self.assertEqual(deproteger("Magal de l'an <x>2026</x>", "fr", "Magal 2026"), "Magal de 2026")
        self.assertEqual(deproteger("The year <x>2026</x> Magal", "en", "Magal 2026"), "2026 Magal")
        self.assertEqual(deproteger("ماغال عام <x>2026</x>", "ar", "Magal 2026"), "ماغال 2026")
        self.assertEqual(deproteger("ماغال <x>2026</x>م", "ar", "Magal 2026"), "ماغال 2026")
        # Si l'auteur a lui-même écrit « l'an 2026 », on respecte son texte.
        self.assertEqual(deproteger("the year <x>2026</x>", "en", "l'an 2026"), "the year 2026")

    def test_lieu_complet_vers_arabe(self):
        from site_web.traduction import deproteger

        self.assertEqual(deproteger("في <x>Keur Ndiaye Lo</x>", "ar"), "في Keur Ndiaye Lo")


class SanteTests(APITestCase):
    def test_sante_sans_base_de_donnees(self):
        with self.assertNumQueries(0):
            res = self.client.get("/api/sante/")
        self.assertEqual(res.json(), {"ok": True})
