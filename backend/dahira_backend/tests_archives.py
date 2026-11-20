from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from comptes.tests_utils import creer_membre
from evenements.models import Evenement
from finances.models import Cotisation
from questions_reponses.models import Question


class ArchivesTests(APITestCase):
    def setUp(self):
        self.admin = creer_membre("+221770000081", role="admin_contenus")
        self.membre = creer_membre("+221770000082")
        self.finance = creer_membre("+221770000083", role="responsable_finance")
        self.ev = Evenement.objects.create(titre="Gamou", date=timezone.now() + timedelta(days=3))

    def test_supprimer_archive_puis_restaurer_puis_definitif(self):
        url = f"/api/evenements/evenements/{self.ev.id}/"
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.ev.refresh_from_db()
        self.assertIsNotNone(self.ev.archive_le)
        # Invisible pour tout le monde, visible dans les archives de l'admin.
        self.assertEqual(self.client.get("/api/evenements/evenements/").data["count"], 0)
        archives = self.client.get("/api/evenements/evenements/?archives=1").data
        self.assertEqual(archives["count"], 1)
        self.assertEqual(archives["results"][0]["archive_par_nom"], self.admin.nom_complet)
        self.assertEqual(self.client.post(f"{url}restaurer/").status_code, 200)
        self.assertEqual(self.client.get("/api/evenements/evenements/").data["count"], 1)
        self.client.delete(url)
        self.assertEqual(self.client.delete(f"{url}definitif/").status_code, 204)
        self.assertFalse(Evenement.objects.filter(pk=self.ev.pk).exists())

    def test_un_membre_ne_voit_pas_les_archives(self):
        self.ev.archive_le = timezone.now()
        self.ev.save()
        self.client.force_authenticate(self.membre)
        self.assertEqual(self.client.get("/api/evenements/evenements/?archives=1").data["count"], 0)
        self.assertEqual(self.client.post(f"/api/evenements/evenements/{self.ev.id}/restaurer/").status_code, 403)

    def test_question_et_cotisation(self):
        q = Question.objects.create(membre=self.membre, texte="?")
        self.client.force_authenticate(self.membre)
        self.assertEqual(self.client.delete(f"/api/questions-reponses/questions/{q.id}/").status_code, 204)
        self.assertEqual(self.client.get("/api/questions-reponses/questions/").data["count"], 0)
        c = Cotisation.objects.create(membre=self.membre, mois=1, annee=2026)
        self.client.force_authenticate(self.finance)
        self.client.delete(f"/api/finances/cotisations/{c.id}/")
        self.client.force_authenticate(self.membre)
        self.assertEqual(self.client.get("/api/finances/cotisations/").data["count"], 0)
        self.client.force_authenticate(self.finance)
        self.assertEqual(self.client.get("/api/finances/cotisations/?archives=1").data["count"], 1)

    def test_taille_de_page(self):
        for i in range(12):
            Evenement.objects.create(titre=f"E{i}", date=timezone.now() + timedelta(days=i + 5))
        res = self.client.get("/api/evenements/evenements/?page_size=10")
        self.assertEqual(len(res.data["results"]), 10)
        self.assertEqual(res.data["count"], 13)
