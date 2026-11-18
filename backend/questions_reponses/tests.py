from rest_framework.test import APITestCase

from comptes.models import Membre
from questions_reponses.models import Question

URL = "/api/questions-reponses/questions/"


def creer_membre(tel, role="membre"):
    return Membre.objects.create_user(
        username=tel, telephone=tel, nom_complet=f"Membre {tel}", password="MotDePasse!2026", role=role
    )


class QuestionSecuriteTests(APITestCase):
    def setUp(self):
        self.membre = creer_membre("+221770000011")
        self.autre = creer_membre("+221770000012")
        self.oustaz = creer_membre("+221770000013", role="oustaz")
        self.ma_question = Question.objects.create(membre=self.membre, texte="Ma question")
        self.question_autre = Question.objects.create(membre=self.autre, texte="Question privée d'un autre")

    def test_membre_ne_voit_que_ses_questions(self):
        self.client.force_authenticate(self.membre)
        res = self.client.get(URL)
        self.assertEqual([q["id"] for q in res.data["results"]], [self.ma_question.id])

    def test_membre_ne_peut_pas_modifier_la_question_dun_autre(self):
        self.client.force_authenticate(self.membre)
        res = self.client.patch(f"{URL}{self.question_autre.id}/", {"texte": "piraté"})
        self.assertEqual(res.status_code, 404)

    def test_membre_ne_peut_pas_supprimer_la_question_dun_autre(self):
        self.client.force_authenticate(self.membre)
        res = self.client.delete(f"{URL}{self.question_autre.id}/")
        self.assertEqual(res.status_code, 404)
        self.assertTrue(Question.objects.filter(id=self.question_autre.id).exists())

    def test_membre_peut_modifier_sa_question_en_attente(self):
        self.client.force_authenticate(self.membre)
        res = self.client.patch(f"{URL}{self.ma_question.id}/", {"texte": "Corrigée"})
        self.assertEqual(res.status_code, 200)

    def test_membre_ne_peut_pas_repondre(self):
        self.client.force_authenticate(self.membre)
        res = self.client.post(f"{URL}{self.ma_question.id}/repondre/", {"texte": "auto-réponse"})
        self.assertEqual(res.status_code, 403)

    def test_oustaz_voit_tout_et_repond(self):
        self.client.force_authenticate(self.oustaz)
        res = self.client.get(URL)
        self.assertEqual(res.data["count"], 2)
        res = self.client.post(f"{URL}{self.question_autre.id}/repondre/", {"texte": "Réponse"})
        self.assertEqual(res.status_code, 201)
        self.question_autre.refresh_from_db()
        self.assertEqual(self.question_autre.statut, "repondu")

    def test_question_repondue_nest_plus_modifiable_par_le_membre(self):
        self.client.force_authenticate(self.oustaz)
        self.client.post(f"{URL}{self.ma_question.id}/repondre/", {"texte": "Réponse"})
        self.client.force_authenticate(self.membre)
        res = self.client.patch(f"{URL}{self.ma_question.id}/", {"texte": "changée après coup"})
        self.assertEqual(res.status_code, 403)
