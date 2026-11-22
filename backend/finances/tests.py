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


# --- Rappels de cotisation et tâches quotidiennes ---------------------------------
from datetime import date  # noqa: E402

from django.core import mail  # noqa: E402
from django.core.cache import cache  # noqa: E402
from django.test import override_settings  # noqa: E402

from comptes.tests_utils import creer_membre as nouveau_membre  # noqa: E402
from finances.models import Cotisation as C, ReglagesRappels  # noqa: E402
from finances.rappels import prochain_envoi, taches_quotidiennes  # noqa: E402


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", TACHES_CLE="secret-test")
class RappelsTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.awa = nouveau_membre("+221775551001", email="awa@exemple.sn")
        self.sans_email = nouveau_membre("+221775551002")
        self.finance = nouveau_membre("+221775551003", role="responsable_finance")

    def test_premier_du_mois_cree_les_cotisations_et_marque_les_retards(self):
        C.objects.create(membre=self.awa, mois=10, annee=2026, statut="non_paye")
        res = taches_quotidiennes(date(2026, 11, 1))
        self.assertEqual(res["cotisations_creees"], 3)
        self.assertEqual(res["passees_en_retard"], 1)
        self.assertEqual(res["rappels_envoyes"], 0)  # avant le jour d'envoi (10)
        self.assertEqual(C.objects.get(membre=self.awa, mois=10).statut, "en_retard")
        # Rappelée deux fois le même jour : rien de plus.
        self.assertEqual(taches_quotidiennes(date(2026, 11, 1))["cotisations_creees"], 0)

    def test_rappel_une_seule_fois_par_mois_au_jour_choisi(self):
        taches_quotidiennes(date(2026, 11, 1))
        res = taches_quotidiennes(date(2026, 11, 10))
        self.assertEqual(res["rappels_envoyes"], 1)  # seule Awa a un e-mail… (le Finance n'en a pas)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["awa@exemple.sn"])
        self.assertIn("novembre 2026", mail.outbox[0].body)
        self.assertEqual(taches_quotidiennes(date(2026, 11, 11))["rappels_envoyes"], 0)
        self.assertEqual(len(mail.outbox), 1)

    def test_rattrapage_si_le_robot_a_manque_le_jour(self):
        taches_quotidiennes(date(2026, 11, 1))
        self.assertEqual(taches_quotidiennes(date(2026, 11, 15))["rappels_envoyes"], 1)

    def test_rappels_desactives(self):
        ReglagesRappels.objects.update_or_create(pk=1, defaults={"actifs": False})
        taches_quotidiennes(date(2026, 11, 1))
        self.assertEqual(taches_quotidiennes(date(2026, 11, 10))["rappels_envoyes"], 0)
        self.assertIsNone(prochain_envoi(ReglagesRappels.charger(), date(2026, 11, 10)))

    def test_membre_a_jour_ne_recoit_rien(self):
        taches_quotidiennes(date(2026, 11, 1))
        C.objects.filter(membre=self.awa).update(statut="paye")
        self.assertEqual(taches_quotidiennes(date(2026, 11, 10))["rappels_envoyes"], 0)

    def test_route_taches_protegee_par_cle(self):
        url = "/api/finances/taches/"
        self.assertEqual(self.client.post(url).status_code, 403)
        self.assertEqual(self.client.post(url, HTTP_X_CLE_TACHES="mauvaise").status_code, 403)
        self.assertEqual(self.client.post(url, HTTP_X_CLE_TACHES="secret-test").status_code, 200)

    @override_settings(TACHES_CLE="")
    def test_sans_cle_configuree_tout_est_refuse(self):
        self.assertEqual(self.client.post("/api/finances/taches/", HTTP_X_CLE_TACHES="").status_code, 403)

    def test_bouton_finance_apercu_reglages_et_envoi(self):
        taches_quotidiennes(date(2026, 11, 1))
        self.client.force_authenticate(self.finance)
        res = self.client.get("/api/finances/rappels/")
        self.assertEqual(res.data["apercu"], {"concernes": 3, "avec_email": 1, "sans_email": 2})
        self.assertEqual(self.client.patch("/api/finances/rappels/", {"jour_envoi": 31}).status_code, 400)
        self.assertEqual(self.client.patch("/api/finances/rappels/", {"jour_envoi": 5}).data["jour_envoi"], 5)
        res = self.client.post("/api/finances/rappels/envoyer/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["envoyes"], 1)
        # Double clic : bloqué.
        self.assertEqual(self.client.post("/api/finances/rappels/envoyer/").status_code, 409)

    def test_simple_membre_refuse(self):
        self.client.force_authenticate(self.awa)
        self.assertEqual(self.client.get("/api/finances/rappels/").status_code, 403)
        self.assertEqual(self.client.post("/api/finances/rappels/envoyer/").status_code, 403)

    def test_email_en_arabe(self):
        self.awa.langue_preferee = "ar"
        self.awa.save()
        taches_quotidiennes(date(2026, 11, 1))
        taches_quotidiennes(date(2026, 11, 10))
        self.assertIn("نوفمبر 2026", mail.outbox[0].body)


class MembresSansCompteEtExcelTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.finance = creer_membre("+221770000051", role="responsable_finance")
        self.membre = creer_membre("+221770000052")

    def test_ajout_sans_telephone_puis_cotisation_du_mois(self):
        self.client.force_authenticate(self.membre)
        self.assertEqual(self.client.post("/api/finances/membres-sans-compte/", {"nom_complet": "X Y"}).status_code, 403)
        self.client.force_authenticate(self.finance)
        res = self.client.post("/api/finances/membres-sans-compte/", {"nom_complet": "  Mame   Diarra Bousso "}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["nom_complet"], "Mame Diarra Bousso")
        self.assertTrue(res.data["carte_numero"].startswith("FDCAS-"))
        # Deux membres sans téléphone : pas de conflit d'unicité.
        self.assertEqual(self.client.post("/api/finances/membres-sans-compte/", {"nom_complet": "Ali Ba"}, format="json").status_code, 201)
        from comptes.models import Membre

        sans = Membre.objects.get(pk=res.data["id"])
        self.assertFalse(sans.has_usable_password())
        self.assertEqual(Cotisation.objects.filter(membre=sans).count(), 1)
        annuaire = self.client.get("/api/comptes/annuaire/").data
        self.assertTrue(any(m["sans_compte"] for m in annuaire))

    def test_inscription_rattache_l_historique(self):
        self.client.force_authenticate(self.finance)
        res = self.client.post("/api/finances/membres-sans-compte/", {"nom_complet": "Awa Sarr", "telephone": "77 555 44 33"}, format="json")
        sans_id, carte = res.data["id"], res.data["carte_numero"]
        self.client.force_authenticate(None)
        rep = self.client.post(
            "/api/comptes/inscription/",
            {"nom_complet": "Awa Sarr", "telephone": "775554433", "telephone_confirmation": "775554433", "password": "MotDePasse-Solide-42"},
            format="json",
        )
        self.assertEqual(rep.status_code, 201, rep.data)
        self.assertEqual(rep.data["membre"]["id"], sans_id)
        self.assertEqual(rep.data["membre"]["carte_numero"], carte)
        self.assertEqual(Cotisation.objects.filter(membre_id=sans_id).count(), 1)
        # Le numéro d'un vrai compte reste protégé.
        rep = self.client.post(
            "/api/comptes/inscription/",
            {"nom_complet": "Z", "telephone": "770000052", "password": "MotDePasse-Solide-42"},
            format="json",
        )
        self.assertEqual(rep.status_code, 400)

    def test_export_excel(self):
        from io import BytesIO

        from django.utils import timezone

        from openpyxl import load_workbook

        Cotisation.objects.create(membre=self.membre, mois=1, annee=2026, statut="paye", montant=1000, moyen_paiement="wave", date_paiement=timezone.now())
        Cotisation.objects.create(membre=self.membre, mois=2, annee=2026, statut="en_retard", montant=1000)
        self.client.force_authenticate(self.membre)
        self.assertEqual(self.client.get("/api/finances/export/?annee=2026").status_code, 403)
        self.client.force_authenticate(self.finance)
        rep = self.client.get("/api/finances/export/?annee=2026")
        self.assertEqual(rep.status_code, 200)
        self.assertIn("cotisations-2026.xlsx", rep["Content-Disposition"])
        classeur = load_workbook(BytesIO(rep.content))
        self.assertEqual(classeur.sheetnames, ["Tableau 2026", "Paiements 2026"])
        tableau = classeur["Tableau 2026"]
        lignes = {r[0]: r for r in tableau.iter_rows(min_row=5, values_only=True)}
        ligne = lignes[self.membre.nom_complet]
        self.assertEqual((ligne[4], ligne[5]), ("Payé", "Retard"))
        self.assertEqual((ligne[16], ligne[17]), (1000, 1000))
        self.assertEqual(classeur["Paiements 2026"]["E4"].value, 1000)
