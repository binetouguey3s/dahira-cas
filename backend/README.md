# Dahira — Backend (Django + DRF)

API REST pour la plateforme du Dahira Cheikh Abdoulahi Seye.

## Démarrage local

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # puis éditer .env si besoin
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

L'API est servie sur `http://127.0.0.1:8000/api/...` et l'admin Django sur
`http://127.0.0.1:8000/admin/`.

## Apps et endpoints principaux

| App | Endpoints |
| --- | --- |
| `comptes` | `POST /api/comptes/inscription/`, `POST /api/comptes/connexion/` (JWT), `POST /api/comptes/connexion/rafraichir/`, `GET/PATCH /api/comptes/moi/` |
| `finances` | `/api/finances/cotisations/` (CRUD) |
| `evenements` | `/api/evenements/evenements/`, `/api/evenements/reservations-bus/` |
| `mediatheque` | `/api/mediatheque/contenus/` (+ actions `aimer/`, `telecharger/`) |
| `questions_reponses` | `/api/questions-reponses/questions/` (+ action `repondre/`, réservée Oustaz/Admin) |
| `notifications` | `/api/notifications/notifications/` (journal, lecture admin) |

Authentification : JWT (`djangorestframework-simplejwt`). Envoyer le jeton dans
l'en-tête `Authorization: Bearer <access_token>`.

## Rôles (`Membre.role`)

`membre`, `responsable_finance`, `oustaz`, `admin_contenus`, `admin_general`.
Attribuer un rôle autre que `membre` se fait depuis l'admin Django (`/admin/`)
pour l'instant.

## Déploiement (Render)

1. Pousser ce dossier `backend/` sur GitHub.
2. Sur [render.com](https://render.com) : New → Web Service → connecter le dépôt.
3. Build command : `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
4. Start command : `gunicorn dahira_backend.wsgi`
5. Ajouter une base PostgreSQL gratuite (New → PostgreSQL) et copier son
   `DATABASE_URL` dans les variables d'environnement du Web Service.
6. Renseigner les autres variables de `.env.example` dans l'onglet
   "Environment" de Render.

Voir le guide complet (toutes les commandes, Vercel, n8n, etc.) à la racine du
projet : `GUIDE_DEMARRAGE.md`.
