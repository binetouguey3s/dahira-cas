import re

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from comptes.tests_utils import MOT_DE_PASSE, creer_membre

OUBLIE = "/api/comptes/mot-de-passe/oublie/"
REINIT = "/api/comptes/mot-de-passe/reinitialiser/"


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", FRONTEND_URL="https://site.test"
)
class MotDePasseOublieTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.membre = creer_membre("+221775550001", email="awa@exemple.sn", langue_preferee="fr")

    def lien(self):
        self.assertEqual(len(mail.outbox), 1)
        return re.search(r"https://site\.test/reinitialiser/(\S+)/(\S+)", mail.outbox[0].body).groups()

    def test_demande_par_telephone_local_et_reinitialisation(self):
        res = self.client.post(OUBLIE, {"identifiant": "77 555 00 01"})
        self.assertEqual(res.status_code, 200)
        uid, jeton = self.lien()
        self.assertEqual(mail.outbox[0].to, ["awa@exemple.sn"])
        res = self.client.post(REINIT, {"uid": uid, "jeton": jeton, "nouveau": "NouveauSecret!2027"})
        self.assertEqual(res.status_code, 200, res.data)
        connexion = self.client.post("/api/comptes/connexion/", {"username": "+221775550001", "password": "NouveauSecret!2027"})
        self.assertEqual(connexion.status_code, 200)
        # Le lien ne sert qu'une fois.
        res = self.client.post(REINIT, {"uid": uid, "jeton": jeton, "nouveau": "EncoreAutre!2028"})
        self.assertEqual(res.status_code, 400)

    def test_demande_par_email(self):
        self.client.post(OUBLIE, {"identifiant": "AWA@exemple.sn"})
        self.lien()

    def test_compte_inconnu_meme_reponse_et_aucun_email(self):
        res = self.client.post(OUBLIE, {"identifiant": "+221770009999"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_compte_sans_email(self):
        creer_membre("+221775550002")
        self.assertEqual(self.client.post(OUBLIE, {"identifiant": "+221775550002"}).status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_jeton_invalide_et_mot_de_passe_trop_faible(self):
        self.client.post(OUBLIE, {"identifiant": "awa@exemple.sn"})
        uid, jeton = self.lien()
        self.assertEqual(self.client.post(REINIT, {"uid": uid, "jeton": "faux", "nouveau": "Bon!Secret2027"}).status_code, 400)
        res = self.client.post(REINIT, {"uid": uid, "jeton": jeton, "nouveau": "123"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("nouveau", res.data)

    def test_limite_de_demandes(self):
        codes = [self.client.post(OUBLIE, {"identifiant": "x@y.z"}).status_code for _ in range(7)]
        self.assertEqual(codes[-1], 429)

    def test_email_dans_la_langue_du_membre(self):
        creer_membre("+221775550003", email="ali@exemple.sn", langue_preferee="ar")
        self.client.post(OUBLIE, {"identifiant": "ali@exemple.sn"})
        self.assertIn("كلمة مرور", mail.outbox[0].subject)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class BienvenueTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_email_de_bienvenue_si_email_fourni(self):
        self.client.post(
            "/api/comptes/inscription/",
            {"nom_complet": "Awa", "telephone": "775550010", "email": "awa2@exemple.sn", "password": MOT_DE_PASSE},
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("+221775550010", mail.outbox[0].body)

    def test_pas_d_email_sans_adresse(self):
        self.client.post("/api/comptes/inscription/", {"nom_complet": "Awa", "telephone": "775550011", "password": MOT_DE_PASSE})
        self.assertEqual(len(mail.outbox), 0)


class BrevoBackendTests(APITestCase):
    @override_settings(BREVO_API_KEY="cle-test", DEFAULT_FROM_EMAIL="dahira@exemple.sn")
    def test_format_envoye_a_brevo(self):
        import json
        from unittest import mock

        from django.core.mail import EmailMultiAlternatives

        from dahira_backend.email_brevo import BrevoEmailBackend

        message = EmailMultiAlternatives("Sujet", "Texte", "Dahira <dahira@exemple.sn>", ["awa@exemple.sn"])
        message.attach_alternative("<p>HTML</p>", "text/html")
        with mock.patch("urllib.request.urlopen") as appel:
            appel.return_value.__enter__.return_value = mock.Mock()
            self.assertEqual(BrevoEmailBackend().send_messages([message]), 1)
        requete = appel.call_args[0][0]
        corps = json.loads(requete.data)
        self.assertEqual(requete.full_url, "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(requete.get_header("Api-key"), "cle-test")
        self.assertEqual(corps["sender"], {"email": "dahira@exemple.sn", "name": "Dahira"})
        self.assertEqual(corps["to"], [{"email": "awa@exemple.sn"}])
        self.assertEqual(corps["htmlContent"], "<p>HTML</p>")


class ReponseVersContactTests(APITestCase):
    def test_reponse_vers_email_de_contact(self):
        from django.core import mail

        from comptes.emails import envoyer_bienvenue
        from site_web.models import Parametres

        p = Parametres.charger()
        p.email_contact = "contact@exemple.sn"
        p.save()
        membre = creer_membre("+221770000092", email="awa@exemple.sn")
        envoyer_bienvenue(membre)
        self.assertEqual(mail.outbox[-1].reply_to, ["contact@exemple.sn"])
