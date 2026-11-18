from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from comptes.tests_utils import creer_membre
from evenements.models import Evenement

RESAS = "/api/evenements/reservations-bus/"


class ReservationBusTests(APITestCase):
    def setUp(self):
        self.a = creer_membre("+221770000071")
        self.b = creer_membre("+221770000072")
        self.admin = creer_membre("+221770000073", role="admin_contenus")
        self.ev = Evenement.objects.create(
            titre="Magal", date=timezone.now() + timedelta(days=10), reservation_bus_active=True, nb_bus=2, places_par_bus=3
        )

    def test_places_restantes_et_capacite(self):
        self.client.force_authenticate(self.a)
        self.assertEqual(self.client.post(RESAS, {"evenement": self.ev.id, "bus_numero": 1, "nb_places": 2}).status_code, 201)
        self.client.force_authenticate(self.b)
        res = self.client.post(RESAS, {"evenement": self.ev.id, "bus_numero": 1, "nb_places": 2})
        self.assertEqual(res.status_code, 400)
        bus = self.client.get(f"/api/evenements/evenements/{self.ev.id}/").data["bus"]
        self.assertEqual(bus[0]["places_restantes"], 1)
        self.assertEqual(bus[1]["places_restantes"], 3)

    def test_bus_inexistant_et_double_reservation(self):
        self.client.force_authenticate(self.a)
        self.assertEqual(self.client.post(RESAS, {"evenement": self.ev.id, "bus_numero": 5}).status_code, 400)
        self.assertEqual(self.client.post(RESAS, {"evenement": self.ev.id, "bus_numero": 1}).status_code, 201)
        self.assertEqual(self.client.post(RESAS, {"evenement": self.ev.id, "bus_numero": 2}).status_code, 400)

    def test_annuler_sa_reservation_mais_pas_celle_dun_autre(self):
        self.client.force_authenticate(self.a)
        resa = self.client.post(RESAS, {"evenement": self.ev.id, "bus_numero": 1}).data
        self.client.force_authenticate(self.b)
        self.assertEqual(self.client.delete(f"{RESAS}{resa['id']}/").status_code, 404)
        self.client.force_authenticate(self.a)
        self.assertEqual(self.client.delete(f"{RESAS}{resa['id']}/").status_code, 204)

    def test_liste_des_reservations_reservee_aux_admins(self):
        url = f"/api/evenements/evenements/{self.ev.id}/reservations/"
        self.client.force_authenticate(self.a)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_membre_ne_peut_pas_creer_devenement(self):
        self.client.force_authenticate(self.a)
        res = self.client.post("/api/evenements/evenements/", {"titre": "x", "date": "2030-01-01T10:00:00Z"})
        self.assertEqual(res.status_code, 403)
