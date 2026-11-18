from rest_framework.test import APITestCase

from comptes.tests_utils import creer_membre
from mediatheque.models import ContenuMedia


class MediathequeTests(APITestCase):
    def setUp(self):
        self.membre = creer_membre("+221770000061")
        self.oustaz = creer_membre("+221770000062", role="oustaz")
        self.contenu = ContenuMedia.objects.create(titre="Causerie", type="texte", description="Texte", auteur="Guide")
        self.url = f"/api/mediatheque/contenus/{self.contenu.id}/"

    def test_like_unique_et_retirable(self):
        self.client.force_authenticate(self.membre)
        res = self.client.post(f"{self.url}aimer/")
        self.assertEqual((res.data["nb_likes"], res.data["aime"]), (1, True))
        self.assertTrue(self.client.get(self.url).data["aime"])
        res = self.client.post(f"{self.url}aimer/")
        self.assertEqual((res.data["nb_likes"], res.data["aime"]), (0, False))

    def test_like_anonyme_refuse(self):
        self.assertEqual(self.client.post(f"{self.url}aimer/").status_code, 401)

    def test_membre_ne_peut_pas_publier(self):
        self.client.force_authenticate(self.membre)
        res = self.client.post("/api/mediatheque/contenus/", {"titre": "x", "type": "texte", "description": "x", "auteur": "x"})
        self.assertEqual(res.status_code, 403)

    def test_oustaz_publie_et_audio_sans_fichier_refuse(self):
        self.client.force_authenticate(self.oustaz)
        res = self.client.post("/api/mediatheque/contenus/", {"titre": "Audio", "type": "audio", "auteur": "Guide"})
        self.assertEqual(res.status_code, 400)
        res = self.client.post(
            "/api/mediatheque/contenus/",
            {"titre": "Audio", "type": "audio", "auteur": "Guide", "url_externe": "https://soundcloud.com/x"},
        )
        self.assertEqual(res.status_code, 201)
