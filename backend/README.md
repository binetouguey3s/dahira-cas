# Backend — API Django

API REST de la plateforme du Dahira Cheikh Abdoulahi Seye (Django 6 + Django REST Framework).

```bash
python -m venv venv && source venv/bin/activate   # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver                          # http://127.0.0.1:8000/api/
python manage.py test                               # tests
```

| Application | Contenu |
|---|---|
| `dahira_backend` | Réglages, URLs, stockage, e-mails Brevo, archives, pagination, erreurs |
| `comptes` | Membres, connexion JWT, mot de passe oublié, carte, statistiques, e-mails |
| `finances` | Cotisations, rappels par e-mail, tâches quotidiennes |
| `evenements` | Événements, réservations de bus (passagers, paiements, responsables) |
| `mediatheque` | Enseignements audio / vidéo / texte |
| `questions_reponses` | Questions des membres et réponses de l'Oustaz |
| `site_web` | Paramètres du site, traduction automatique (DeepL) |
| `notifications` | Journal des notifications |

Documentation complète :
- endpoints, modèles, permissions et règles métier : [`../docs/DOCUMENTATION_TECHNIQUE.md`](../docs/DOCUMENTATION_TECHNIQUE.md) ;
- variables d'environnement, déploiement Render / Neon et maintenance : [`../GUIDE_DEMARRAGE.md`](../GUIDE_DEMARRAGE.md).
