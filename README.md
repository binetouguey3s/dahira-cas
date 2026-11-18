# Plateforme officielle du Dahira Cheikh Abdoulahi Seye

Application web mobile-first (installable en PWA) dédiée aux enseignements
du Guide et à la gestion communautaire du Dahira : biographie, médiathèque
audio/vidéo/texte, questions & réponses (fatwas), vie du Dahira & événements
(avec réservation de bus), cotisations, et espace membres multi-rôles.

- **Frontend** : React + TypeScript + Vite + Tailwind CSS v4, FR/EN/AR avec
  support RTL. Voir `frontend/README.md`.
- **Backend** : Django + Django REST Framework, authentification JWT, 6
  applications métier (comptes, finances, événements, médiathèque,
  questions-réponses, notifications). Voir `backend/README.md`.

## Démarrage rapide

Toutes les commandes (installation, lancement local, GitHub, déploiement
Vercel/Render, automatisations n8n, email, WhatsApp, Cloudinary) sont
détaillées pas à pas dans **[`GUIDE_DEMARRAGE.md`](./GUIDE_DEMARRAGE.md)**.

En résumé :

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend (nouveau terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend : http://localhost:5173 — Backend : http://127.0.0.1:8000

## Stack technique

| Couche | Choix |
|---|---|
| Frontend | React (Vite), TypeScript, Tailwind CSS v4, Lucide Icons, React Router, i18next |
| Backend | Django, Django REST Framework, SimpleJWT, django-filter, django-cors-headers |
| Base de données | PostgreSQL (SQLite en local) |
| Hébergement | Vercel (frontend) + Render (backend + PostgreSQL) — gratuit ; LWS envisagé plus tard |
| Automatisations | n8n (rappels, notifications) |
| Email | Brevo |
| WhatsApp | Meta Cloud API / Twilio |
| Médias | Stockage local par défaut, migration Cloudinary recommandée en production |

## Rôles de la plateforme

`membre` (par défaut) · `responsable_finance` · `oustaz` · `admin_contenus` ·
`admin_general`. Les rôles s'attribuent depuis l'admin Django ou en ligne de
commande — voir la section 3 du guide de démarrage.
