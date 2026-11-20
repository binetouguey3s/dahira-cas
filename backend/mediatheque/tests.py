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


class CategorieMediaTests(APITestCase):
    URL = "/api/mediatheque/contenus/"

    def setUp(self):
        self.oustaz = creer_membre("+221770000071", role="oustaz")
        self.client.force_authenticate(self.oustaz)

    def publier(self, **extra):
        return self.client.post(self.URL, {"titre": "Causerie", "type": "texte", "description": "Texte", "auteur": "Guide", **extra})

    def test_categorie_choisie_et_filtre(self):
        self.assertEqual(self.publier(categorie="nisfou_shabaan").status_code, 201)
        self.publier(categorie="magal")
        res = self.client.get(f"{self.URL}?categorie=nisfou_shabaan")
        self.assertEqual([c["categorie"] for c in res.data["results"]], ["nisfou_shabaan"])

    def test_autre_avec_precision_libre(self):
        res = self.publier(categorie="autre", categorie_autre="  Kazu Rajab ")
        self.assertEqual(res.data["categorie_autre"], "Kazu Rajab")
        # La précision est effacée si on choisit une autre catégorie.
        res = self.client.patch(f"{self.URL}{res.data['id']}/", {"categorie": "gamou"})
        self.assertEqual((res.data["categorie"], res.data["categorie_autre"]), ("gamou", ""))

    def test_categorie_reprise_de_l_evenement(self):
        from django.utils import timezone

        from evenements.models import Evenement

        ev = Evenement.objects.create(titre="Leylatul Khadr 2027", categorie="leylatul_khadr", date=timezone.now())
        self.assertEqual(self.publier(evenement=ev.id).data["categorie"], "leylatul_khadr")

    def test_categorie_inconnue_refusee(self):
        self.assertEqual(self.publier(categorie="nimporte").status_code, 400)
