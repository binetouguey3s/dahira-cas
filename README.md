# Plateforme du Dahira Cheikh Abdoulahi Seye

Application web officielle du Dahira, pensée d'abord pour le téléphone : enseignements du Guide,
médiathèque, vie du Dahira (événements et réservation de bus), cotisations, questions à l'Oustaz,
carte de membre avec QR code et espace d'administration par rôles.

- **Site** : https://dahira-cas.vercel.app
- **API** : https://dahira-cas.onrender.com/api/
- **Langues** : français, anglais, espagnol, arabe (affichage de droite à gauche), avec traduction
  automatique des textes saisis par l'administration.
- **Thèmes** : clair et sombre.

## Documentation

| Document | Pour qui | Contenu |
|---|---|---|
| [Guide utilisateur](docs/GUIDE_UTILISATEUR.md) | Membres | Version imprimable : [PDF](docs/Guide-utilisateur-Dahira.pdf). S'inscrire, se connecter, carte de membre, cotisations, bus, questions |
| [Guide d'administration](docs/GUIDE_ADMINISTRATION.md) | Responsables du Dahira | Rôles, membres, finance, médiathèque, événements, bus, archives, paramètres |
| [Documentation technique](docs/DOCUMENTATION_TECHNIQUE.md) | Développeurs | Architecture, modèles, API, sécurité, traduction, tâches automatiques, tests |
| [Guide de démarrage et de déploiement](GUIDE_DEMARRAGE.md) | Développeurs | Installation locale, variables d'environnement, hébergement, maintenance |

## Fonctionnalités

**Pour tous les visiteurs**
- Accueil : salutation, conseil du jour, 4 prochains événements, 4 derniers enseignements,
  vidéo guide (facultative), liens vers les réseaux sociaux du Dahira.
- Biographie du Guide, avec vidéo guide (fichier ou lien YouTube / Vimeo).
- Médiathèque audio, vidéo et texte : recherche, filtres par type et par occasion
  (Magal, Gamou, Nisfou Shabaan, Leylatul Khadr…), pagination par 10.
- Événements à venir et passés, compte à rebours, ajout à l'agenda, partage.
- Vérification publique d'une carte de membre par QR code.

**Pour les membres connectés**
- Inscription par téléphone (saisi deux fois, avec indicatif et drapeau de tous les pays).
- Mot de passe oublié par e-mail.
- Carte de membre recto verso avec photo et QR code, à imprimer ou enregistrer dans les photos.
- Cotisations : historique, mois payés et en retard, numéros Wave / Orange Money.
- Questions à l'Oustaz (texte ou message vocal) et réponses.
- Réservation de bus : un nom par passager, places attribuées automatiquement, paiement Wave /
  Orange Money / espèces, acompte possible, suivi du statut.

**Pour l'administration** (selon le rôle)
- Tableau de bord avec les chiffres clés.
- Membres : rôles, comptes, mots de passe provisoires, inscription d'un membre sans smartphone.
- Finance : cotisations du mois, encaissement, relances WhatsApp, rappels automatiques par e-mail.
- Médiathèque, événements, questions, paramètres du site.
- Espace bus des responsables : paiements à vérifier, listes par bus, impression, export Excel.
- Archives : tout élément supprimé peut être restauré ou supprimé définitivement.

## Architecture en bref

```
Navigateur (React)  ──►  Vercel (site statique)
        │
        └── API JSON ──►  Render (Django + DRF)  ──►  Neon (PostgreSQL)
                                   │
                                   ├──► Cloudinary (photos, audios, vidéos)
                                   ├──► Brevo (e-mails)
                                   └──► DeepL (traduction automatique)

GitHub Actions (chaque matin)  ──►  /api/finances/taches/  (cotisations du mois, retards, rappels)
UptimeRobot (toutes les 5 min) ──►  /api/sante/            (garde le serveur éveillé)
```

| Couche | Choix |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Radix UI, i18next, React Router |
| Backend | Django 6, Django REST Framework, SimpleJWT, django-filter, phonenumbers |
| Base de données | PostgreSQL (Neon) en production, SQLite en local |
| Fichiers | Cloudinary (production), disque local (développement) |
| E-mails | API HTTP Brevo |
| Traduction | DeepL (termes religieux, noms et lieux protégés) |
| Hébergement | Vercel (frontend) + Render (backend), déploiement automatique à chaque `git push` sur `main` |

## Démarrage rapide (développement)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver                          # http://127.0.0.1:8000

# Frontend (second terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                                         # http://localhost:5173
```

Tests du backend : `cd backend && python manage.py test`.
Vérification du frontend : `cd frontend && npx tsc -b && npm run build`.

Toutes les étapes détaillées (variables d'environnement, déploiement, services externes,
dépannage) sont dans [GUIDE_DEMARRAGE.md](GUIDE_DEMARRAGE.md).

## Rôles

| Rôle | Accès |
|---|---|
| `membre` | Espace membre (rôle par défaut à l'inscription) |
| `responsable_finance` | Cotisations, encaissements, rappels |
| `oustaz` | Questions des membres, médiathèque, paramètres du site |
| `admin_contenus` | Médiathèque, événements, réservations de bus, paramètres du site |
| `admin_general` | Tout, y compris la gestion des membres et des rôles |

Un membre de n'importe quel rôle peut en plus être désigné **responsable des bus** d'un événement.

## Structure du dépôt

```
backend/            API Django (une application par domaine métier)
frontend/           Application React
docs/               Documentation (guides et conceptions)
.github/workflows/  Robot quotidien (GitHub Actions)
GUIDE_DEMARRAGE.md  Installation, déploiement et maintenance
```
