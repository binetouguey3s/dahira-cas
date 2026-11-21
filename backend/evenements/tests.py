from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from comptes.tests_utils import creer_membre
from evenements.models import Evenement, PassagerBus

EVS = "/api/evenements/evenements/"
RESAS = "/api/evenements/reservations-bus/"


def passagers(*noms, moi=False):
    liste = [{"nom": "", "est_titulaire": True}] if moi else []
    return liste + [{"nom": n} for n in noms]


class ReservationBusTests(APITestCase):
    def setUp(self):
        self.a = creer_membre("+221770000071")
        self.b = creer_membre("+221770000072")
        self.admin = creer_membre("+221770000073", role="admin_contenus")
        self.resp = creer_membre("+221770000074")
        self.ev = Evenement.objects.create(
            titre="Magal",
            date=timezone.now() + timedelta(days=10),
            reservation_bus_active=True,
            nb_bus=2,
            places_par_bus=3,
            prix_place=5000,
        )
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"{EVS}{self.ev.id}/", {"responsables_ids": [self.resp.id]}, format="json")
        self.assertEqual(res.status_code, 200, res.data)

    def reserver(self, membre, liste):
        self.client.force_authenticate(membre)
        return self.client.post(RESAS, {"evenement": self.ev.id, "passagers": liste}, format="json")

    def test_places_attribuees_bus_par_bus_et_groupe_decoupe(self):
        res = self.reserver(self.a, passagers("Awa Fall", moi=True))
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual([p["bus_numero"] for p in res.data["passagers"]], [1, 1])
        # « Moi » prend automatiquement le nom du membre.
        self.assertIn(self.a.nom_complet, [p["nom"] for p in res.data["passagers"]])
        res = self.reserver(self.b, passagers("Modou Diop", "Fatou Sy", moi=True))
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(sorted(p["bus_numero"] for p in res.data["passagers"]), [1, 2, 2])
        self.assertEqual(res.data["montant_du"], 15000)
        self.assertEqual(res.data["statut"], "en_attente")
        ev = self.client.get(f"{EVS}{self.ev.id}/").data
        self.assertEqual(ev["places_restantes"], 1)

    def test_complet(self):
        self.reserver(self.a, passagers("A1", "A2", "A3", "A4", "A5"))
        res = self.reserver(self.b, passagers("B1", "B2"))
        self.assertEqual(res.status_code, 400)
        self.assertIn("1 place", str(res.data))

    def test_une_seule_reservation_par_membre_et_noms_obligatoires(self):
        self.assertEqual(self.reserver(self.a, passagers("x")).status_code, 400)
        self.assertEqual(self.reserver(self.a, passagers(moi=True)).status_code, 201)
        self.assertEqual(self.reserver(self.a, passagers(moi=True)).status_code, 400)

    def test_paiement_declare_puis_valide_par_le_responsable(self):
        resa = self.reserver(self.a, passagers("Awa Fall", moi=True)).data
        responsable_id = self.client.get(f"{EVS}{self.ev.id}/").data["responsables"][0]["id"]
        res = self.client.post(
            f"{RESAS}{resa['id']}/paiements/",
            {"montant": 4000, "moyen": "wave", "reference": "TX1", "responsable": responsable_id},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        paiement = res.data["paiements"][0]
        self.assertEqual(paiement["statut"], "a_verifier")
        self.assertEqual(res.data["statut"], "en_attente")
        # Un simple membre ne peut pas valider.
        self.assertEqual(self.client.post(f"/api/evenements/paiements-bus/{paiement['id']}/valider/").status_code, 403)
        self.client.force_authenticate(self.resp)
        res = self.client.post(f"/api/evenements/paiements-bus/{paiement['id']}/valider/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["statut"], "acompte")
        self.assertTrue(res.data["acceptee"])
        # Le responsable enregistre le reste en espèces : validé d'office.
        res = self.client.post(f"{RESAS}{resa['id']}/paiements/", {"montant": 6000, "moyen": "especes"}, format="json")
        self.assertEqual(res.data["statut"], "payee")
        # Après un paiement validé, le membre ne peut plus annuler seul.
        self.client.force_authenticate(self.a)
        self.assertEqual(self.client.delete(f"{RESAS}{resa['id']}/").status_code, 400)

    def test_modifier_les_passagers(self):
        resa = self.reserver(self.a, passagers("Awa Fall", moi=True)).data
        moi = next(p for p in resa["passagers"] if p["est_titulaire"])
        res = self.client.patch(
            f"{RESAS}{resa['id']}/",
            {"passagers": [{"id": moi["id"], "nom": "", "est_titulaire": True}, {"nom": "Ndeye Sarr"}, {"nom": "Ali Ba"}]},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(sorted(p["nom"] for p in res.data["passagers"]), sorted([self.a.nom_complet, "Ndeye Sarr", "Ali Ba"]))
        self.assertEqual(PassagerBus.objects.filter(reservation_id=resa["id"]).count(), 3)

    def test_annulation_libere_les_places_et_acces(self):
        resa = self.reserver(self.a, passagers("Awa Fall", moi=True)).data
        self.client.force_authenticate(self.b)
        self.assertEqual(self.client.delete(f"{RESAS}{resa['id']}/").status_code, 404)
        self.client.force_authenticate(self.a)
        self.assertEqual(self.client.delete(f"{RESAS}{resa['id']}/").status_code, 204)
        self.assertEqual(PassagerBus.objects.count(), 0)

    def test_espace_du_responsable(self):
        self.reserver(self.a, passagers("Awa Fall", moi=True))
        gestion = f"{EVS}{self.ev.id}/gestion-bus/"
        self.client.force_authenticate(self.b)
        self.assertEqual(self.client.get(gestion).status_code, 403)
        self.assertEqual(self.client.get(f"{EVS}espace-bus/").data, [])
        self.client.force_authenticate(self.resp)
        self.assertTrue(self.client.get("/api/comptes/moi/").data["est_responsable_bus"])
        self.assertEqual(len(self.client.get(f"{EVS}espace-bus/").data), 1)
        data = self.client.get(gestion).data
        self.assertEqual(len(data["bus"][0]["passagers"]), 2)
        self.assertEqual(data["totaux"]["montant_du"], 10000)
        # Changer un passager de bus, puis réserver pour une personne sans téléphone.
        passager = data["bus"][0]["passagers"][1]
        res = self.client.patch(f"/api/evenements/passagers-bus/{passager['id']}/", {"bus_numero": 2}, format="json")
        self.assertEqual(res.data["bus_numero"], 2)
        res = self.client.post(
            RESAS,
            {"evenement": self.ev.id, "nom_contact": "Mame Diarra", "telephone_contact": "771112233", "passagers": passagers("Mame Diarra")},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["titulaire_nom"], "Mame Diarra")
        self.assertTrue(res.data["acceptee"])
        # Ses propres numéros de paiement.
        rid = self.client.get(f"{EVS}{self.ev.id}/").data["responsables"][0]["id"]
        res = self.client.patch(f"/api/evenements/responsables-bus/{rid}/", {"numero_wave": "77 000 00 01"}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_un_membre_ne_peut_pas_reserver_pour_autrui(self):
        self.client.force_authenticate(self.a)
        res = self.client.post(
            RESAS, {"evenement": self.ev.id, "nom_contact": "X Y", "passagers": passagers("X Y")}, format="json"
        )
        self.assertEqual(res.status_code, 400)

    def test_reduire_les_bus_sous_les_places_occupees_refuse(self):
        self.reserver(self.a, passagers("A1", "A2", "A3", "A4"))
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(f"{EVS}{self.ev.id}/", {"nb_bus": 1}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(f"{EVS}{self.ev.id}/", {"places_par_bus": 2}, format="json").status_code, 400)

    def test_responsables_invisibles_pour_les_visiteurs(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f"{EVS}{self.ev.id}/").data["responsables"], [])

    def test_membre_ne_peut_pas_creer_devenement(self):
        self.client.force_authenticate(self.a)
        res = self.client.post(EVS, {"titre": "x", "date": "2030-01-01T10:00:00Z"})
        self.assertEqual(res.status_code, 403)


class AnnonceEvenementTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.admin = creer_membre("+221770000061", role="admin_contenus", email="admin@exemple.sn")
        self.awa = creer_membre("+221770000062", email="awa@exemple.sn")
        self.modou = creer_membre("+221770000063", email="modou@exemple.sn", langue_preferee="en")
        creer_membre("+221770000064")  # sans e-mail
        creer_membre("+221770000065", email="non@exemple.sn", recevoir_annonces=False)
        self.ev = Evenement.objects.create(
            titre="Grand Magal de Touba", lieu="Keur Ndiaye Lo", date=timezone.now() + timedelta(days=5),
            reservation_bus_active=True, nb_bus=1, places_par_bus=10,
        )

    def test_annonce_envoyee_une_seule_fois(self):
        from django.core import mail

        url = f"{EVS}{self.ev.id}/annoncer/"
        self.client.force_authenticate(self.awa)
        self.assertEqual(self.client.post(url).status_code, 403)
        self.client.force_authenticate(self.admin)
        res = self.client.post(url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["destinataires"], 3)  # admin, Awa, Modou (pas sans e-mail, pas refus)
        self.assertEqual(len(mail.outbox), 3)
        sujets = {m.to[0]: m.subject for m in mail.outbox}
        self.assertIn("Grand Magal de Touba", sujets["awa@exemple.sn"])
        self.assertTrue(sujets["modou@exemple.sn"].startswith("New event"))
        self.assertIn("Keur Ndiaye Lo", mail.outbox[0].body)
        self.assertIn(f"/evenements/{self.ev.id}", mail.outbox[0].body)
        # Deuxième clic : personne ne la reçoit deux fois.
        self.assertEqual(self.client.post(url).data["destinataires"], 0)
        self.assertEqual(len(mail.outbox), 3)
        etat = self.client.get(f"{EVS}{self.ev.id}/?avec_annonce=1").data["annonce"]
        self.assertEqual((etat["envoyes"], etat["restants"]), (3, 0))

    def test_quota_puis_suite_le_lendemain(self):
        from django.core import mail

        from evenements import annonces
        from finances.rappels import taches_quotidiennes

        ancien = annonces.QUOTA_JOUR
        annonces.QUOTA_JOUR = 2
        try:
            self.client.force_authenticate(self.admin)
            res = self.client.post(f"{EVS}{self.ev.id}/annoncer/").data
            self.assertEqual((res["envoi_immediat"], res["reportes"]), (2, 1))
            self.assertEqual(len(mail.outbox), 2)
            annonces.QUOTA_JOUR = 10
            taches_quotidiennes()
            self.assertEqual(len([m for m in mail.outbox if m.subject.startswith(("Nouvel", "New"))]), 3)
        finally:
            annonces.QUOTA_JOUR = ancien

    def test_evenement_passe_refuse(self):
        self.ev.date = timezone.now() - timedelta(days=1)
        self.ev.save()
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(f"{EVS}{self.ev.id}/annoncer/").status_code, 400)

    def test_membre_peut_couper_les_annonces(self):
        self.client.force_authenticate(self.awa)
        res = self.client.patch("/api/comptes/moi/", {"recevoir_annonces": False}, format="json")
        self.assertFalse(res.data["recevoir_annonces"])
