from rest_framework.test import APITestCase

from comptes.models import Membre
from finances.models import Cotisation

URL = "/api/finances/cotisations/"


def creer_membre(tel, role="membre", **kwargs):
    return Membre.objects.create_user(
        username=tel, telephone=tel, nom_complet=f"Membre {tel}", password="MotDePasse!2026", role=role, **kwargs
    )


class CotisationSecuriteTests(APITestCase):
    def setUp(self):
        self.membre = creer_membre("+221770000001")
        self.autre = creer_membre("+221770000002")
        self.finance = creer_membre("+221770000003", role="responsable_finance")
        self.cotisation = Cotisation.objects.create(membre=self.membre, mois=1, annee=2026, montant=1000)
        Cotisation.objects.create(membre=self.autre, mois=1, annee=2026, montant=1000)

    def test_membre_ne_voit_que_ses_cotisations(self):
        self.client.force_authenticate(self.membre)
        res = self.client.get(URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual([c["membre"] for c in res.data["results"]], [self.membre.id])

    def test_membre_ne_peut_pas_se_declarer_paye(self):
        self.client.force_authenticate(self.membre)
        res = self.client.patch(f"{URL}{self.cotisation.id}/", {"statut": "paye"})
        self.assertEqual(res.status_code, 403)
        self.cotisation.refresh_from_db()
        self.assertEqual(self.cotisation.statut, "non_paye")

    def test_membre_ne_peut_pas_creer_de_cotisation(self):
        self.client.force_authenticate(self.membre)
        res = self.client.post(URL, {"membre": self.autre.id, "mois": 2, "annee": 2026, "montant": 1000, "statut": "paye"})
        self.assertEqual(res.status_code, 403)

    def test_membre_ne_peut_pas_supprimer(self):
        self.client.force_authenticate(self.membre)
        res = self.client.delete(f"{URL}{self.cotisation.id}/")
        self.assertEqual(res.status_code, 403)

    def test_finance_peut_marquer_paye_et_date_renseignee(self):
        self.client.force_authenticate(self.finance)
        res = self.client.patch(f"{URL}{self.cotisation.id}/", {"statut": "paye", "moyen_paiement": "wave"})
        self.assertEqual(res.status_code, 200)
        self.cotisation.refresh_from_db()
        self.assertEqual(self.cotisation.statut, "paye")
        self.assertIsNotNone(self.cotisation.date_paiement)

    def test_finance_peut_creer_une_cotisation(self):
        self.client.force_authenticate(self.finance)
        res = self.client.post(URL, {"membre": self.membre.id, "mois": 3, "annee": 2026, "montant": 1000})
        self.assertEqual(res.status_code, 201)

    def test_anonyme_refuse(self):
        self.assertEqual(self.client.get(URL).status_code, 401)


class GenererCotisationsTests(APITestCase):
    def test_generer_le_mois_sans_doublon(self):
        finance = creer_membre("+221770000081", role="responsable_finance")
        creer_membre("+221770000082")
        inactif = creer_membre("+221770000083")
        inactif.is_active = False
        inactif.save()
        self.client.force_authenticate(finance)
        donnees = {"mois": 5, "annee": 2026, "montant": 1000}
        self.assertEqual(self.client.post(f"{URL}generer/", donnees).data["creees"], 2)
        self.assertEqual(self.client.post(f"{URL}generer/", donnees).data["creees"], 0)

    def test_membre_ne_peut_pas_generer(self):
        self.client.force_authenticate(creer_membre("+221770000084"))
        self.assertEqual(self.client.post(f"{URL}generer/", {"mois": 5, "annee": 2026, "montant": 1}).status_code, 403)
