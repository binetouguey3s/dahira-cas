# Guide de démarrage — Plateforme Dahira Cheikh Abdoulahi Seye

Ce guide contient **toutes les commandes** nécessaires pour faire tourner le
projet en local, le mettre sur GitHub, puis le déployer gratuitement
(Vercel + Render), et brancher les automatisations (n8n, email, WhatsApp).
Copiez-collez les commandes dans l'ordre, dans un terminal, depuis le dossier
où vous avez dézippé le projet.

Sommaire :

1. [Prérequis à installer](#1-prérequis-à-installer)
2. [Lancer le projet en local](#2-lancer-le-projet-en-local)
3. [Créer un compte administrateur](#3-créer-un-compte-administrateur)
4. [Mettre le projet sur GitHub](#4-mettre-le-projet-sur-github)
5. [Déployer le backend sur Render](#5-déployer-le-backend-sur-render-gratuit)
6. [Déployer le frontend sur Vercel](#6-déployer-le-frontend-sur-vercel-gratuit)
7. [Brancher les automatisations n8n](#7-brancher-les-automatisations-n8n-gratuit)
8. [Envoi d'emails avec Brevo](#8-envoi-demails-avec-brevo-gratuit)
9. [Notifications WhatsApp](#9-notifications-whatsapp)
10. [Stockage des fichiers médias avec Cloudinary](#10-stockage-des-fichiers-médias-avec-cloudinary-optionnel)
11. [Migration future vers LWS](#11-migration-future-vers-lws)
12. [Dépannage courant](#12-dépannage-courant)

---

## 1. Prérequis à installer

Sur votre ordinateur (une seule fois) :

- **Python 3.11+** → [python.org/downloads](https://www.python.org/downloads/)
- **Node.js 20+** (inclut npm) → [nodejs.org](https://nodejs.org/)
- **Git** → [git-scm.com/downloads](https://git-scm.com/downloads)
- **VSCode** → [code.visualstudio.com](https://code.visualstudio.com/)
- Un compte **GitHub** (gratuit) → [github.com](https://github.com)
- Un compte **Vercel** (gratuit, connectez-vous avec GitHub) → [vercel.com](https://vercel.com)
- Un compte **Render** (gratuit, connectez-vous avec GitHub) → [render.com](https://render.com)

Vérifiez les installations :

```bash
python --version
node --version
npm --version
git --version
```

---

## 2. Lancer le projet en local

### 2.1 Backend (Django)

```bash
cd backend

# Créer et activer un environnement virtuel Python
python -m venv venv

# Sur Windows :
venv\Scripts\activate
# Sur Mac / Linux :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier d'environnement local
cp .env.example .env
# (Sur Windows sans "cp" : copy .env.example .env)

# Appliquer les migrations de base de données
python manage.py migrate

# Créer un super-administrateur Django (accès à /admin/)
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

Le backend tourne maintenant sur **http://127.0.0.1:8000**.
Admin Django : http://127.0.0.1:8000/admin/

### 2.2 Frontend (React)

Dans un **second terminal**, en gardant le backend lancé :

```bash
cd frontend

npm install

cp .env.example .env
# (Sur Windows : copy .env.example .env)

npm run dev
```

L'application tourne maintenant sur **http://localhost:5173**.

---

## 3. Créer un compte administrateur

Deux façons de donner un rôle (Finance, Oustaz, Admin Contenus, Admin Général)
à un membre :

**Option A — via l'admin Django (recommandé) :**

1. Allez sur http://127.0.0.1:8000/admin/ et connectez-vous avec le
   super-administrateur créé à l'étape 2.1.
2. Cliquez sur **Membres**, choisissez le membre (il doit déjà s'être
   inscrit depuis l'application), puis changez son champ **Role**.

**Option B — en ligne de commande :**

```bash
cd backend
python manage.py shell
```

Puis dans le shell Python qui s'ouvre :

```python
from comptes.models import Membre
m = Membre.objects.get(telephone="+221771234567")
m.role = "admin_general"   # ou "responsable_finance", "oustaz", "admin_contenus"
m.save()
exit()
```

---

## 4. Mettre le projet sur GitHub

Dans le dossier racine du projet (celui qui contient `backend/` et `frontend/`) :

```bash
git init
git add .
git commit -m "Premier commit — Plateforme Dahira Cheikh Abdoulahi Seye"
```

Créez ensuite un nouveau dépôt **vide** sur GitHub (sans README, sans
.gitignore — vous en avez déjà) : https://github.com/new

Puis reliez-le et poussez :

```bash
git branch -M main
git remote add origin https://github.com/VOTRE-UTILISATEUR/dahira-platform.git
git push -u origin main
```

---

## 5. Déployer le backend sur Render (gratuit)

1. Sur [render.com](https://render.com), cliquez **New +** → **Web Service**.
2. Connectez votre dépôt GitHub `dahira-platform`.
3. Réglages :
   - **Root Directory** : `backend`
   - **Runtime** : Python 3
   - **Build Command** :
     ```
     pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
     ```
   - **Start Command** :
     ```
     gunicorn dahira_backend.wsgi
     ```
4. Ajoutez une base de données : **New +** → **PostgreSQL** (plan gratuit),
   puis copiez son **Internal Database URL**.
5. Dans les **Environment Variables** du Web Service, ajoutez :
   - `SECRET_KEY` → générez une valeur aléatoire longue (ex. avec
     `python -c "import secrets; print(secrets.token_urlsafe(50))"`)
   - `DEBUG` → `False`
   - `ALLOWED_HOSTS` → `votre-backend.onrender.com`
   - `DATABASE_URL` → l'URL PostgreSQL copiée à l'étape 4
   - `CORS_ALLOWED_ORIGINS` → `https://votre-frontend.vercel.app` (vous la
     connaîtrez après l'étape 6 — vous pourrez revenir la modifier)
6. Cliquez **Create Web Service**. Render construit et déploie automatiquement
   à chaque `git push` sur `main`.
7. Une fois en ligne, créez le super-administrateur en production via le
   **Shell** de Render (onglet "Shell" du service) :
   ```
   python manage.py createsuperuser
   ```

---

## 6. Déployer le frontend sur Vercel (gratuit)

1. Sur [vercel.com](https://vercel.com), cliquez **Add New…** → **Project**.
2. Importez le dépôt GitHub `dahira-platform`.
3. Réglages :
   - **Root Directory** : `frontend`
   - Framework détecté automatiquement : **Vite**
4. **Environment Variables** :
   - `VITE_API_URL` → `https://votre-backend.onrender.com/api`
5. Cliquez **Deploy**.
6. Une fois déployé, copiez l'URL Vercel (ex. `https://dahira.vercel.app`) et
   retournez sur Render pour mettre à jour `CORS_ALLOWED_ORIGINS` avec cette
   URL exacte (étape 5.5), puis redéployez le backend.

À partir de maintenant, chaque `git push` met à jour automatiquement les deux
sites (Vercel et Render sont tous deux branchés sur GitHub).

```bash
git add .
git commit -m "Mise à jour"
git push
```

---

## 7. Brancher les automatisations n8n (gratuit)

n8n sert à automatiser les rappels de cotisation, les notifications de
nouveaux événements, etc. Le plus simple et gratuit : l'héberger sur Render
également (ou en local pour commencer).

**Essai rapide en local :**

```bash
npx n8n
```

Ouvre l'interface sur http://localhost:5678. Créez un workflow déclenché par
un **Webhook**, puis copiez son URL dans la variable `N8N_WEBHOOK_URL` du
fichier `.env` du backend (et dans les variables d'environnement Render en
production).

**Hébergement gratuit permanent (optionnel, plus avancé) :** déployer n8n sur
Render via son image Docker officielle (`n8nio/n8n`), en suivant le guide
officiel : https://docs.n8n.io/hosting/

Exemples de workflows à créer dans n8n :

- **Rappel de cotisation** : déclencheur programmé (Cron) une fois par mois →
  requête HTTP vers `GET /api/finances/cotisations/?statut=non_paye` sur le
  backend → envoi d'un email (Brevo) ou message WhatsApp à chaque membre
  concerné.
- **Nouvel événement** : webhook appelé par Django quand un événement est créé
  → envoi d'une notification à tous les membres.

---

## 8. Envoi d'emails avec Brevo (gratuit)

1. Créez un compte gratuit sur [brevo.com](https://www.brevo.com/) (300
   emails/jour gratuits).
2. Dans **Paramètres → SMTP & API → SMTP**, récupérez vos identifiants SMTP.
3. Dans le `.env` du backend (local) et dans les variables Render (production) :
   ```
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp-relay.brevo.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=votre-identifiant-smtp-brevo
   EMAIL_HOST_PASSWORD=votre-cle-smtp-brevo
   ```
   *(Ajoutez `EMAIL_HOST` et `EMAIL_PORT` à `dahira_backend/settings.py` si
   vous voulez les piloter par variables d'environnement — actuellement
   `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` sont déjà prévus dans
   `.env.example`.)*

---

## 9. Notifications WhatsApp

Deux options gratuites pour démarrer :

- **Twilio Sandbox WhatsApp** (gratuit en mode test) :
  [twilio.com/whatsapp](https://www.twilio.com/whatsapp) — récupérez votre
  `Account SID`, `Auth Token` et le numéro sandbox, puis utilisez-les dans un
  nœud HTTP Request de n8n pour envoyer des messages.
- **Meta Cloud API** (gratuit, officiel WhatsApp Business) :
  [developers.facebook.com/docs/whatsapp/cloud-api](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) —
  demande une vérification d'entreprise mais pas de frais mensuels pour un
  faible volume.

Dans les deux cas, le plus simple est de déclencher l'envoi **depuis n8n**
(nœud HTTP ou nœud WhatsApp dédié) plutôt que depuis Django directement,
pour pouvoir changer de fournisseur sans toucher au code.

---

## 10. Stockage des fichiers médias avec Cloudinary (optionnel)

Par défaut, les fichiers audio/vidéo uploadés sont stockés sur le disque du
serveur Render — ce qui **n'est pas persistant** sur le plan gratuit (les
fichiers peuvent être perdus au redémarrage). Pour un stockage fiable et
gratuit (jusqu'à 25 Go) :

1. Créez un compte sur [cloudinary.com](https://cloudinary.com/).
2. Récupérez `Cloud name`, `API Key`, `API Secret` depuis le tableau de bord.
3. Dans le `.env` / variables Render :
   ```
   CLOUDINARY_CLOUD_NAME=votre-cloud-name
   CLOUDINARY_API_KEY=votre-api-key
   CLOUDINARY_API_SECRET=votre-api-secret
   ```
4. Décommentez les deux lignes Cloudinary dans `backend/requirements.txt` et
   relancez `pip install -r requirements.txt`. Le code de `settings.py` active
   déjà automatiquement le stockage Cloudinary dès que ces variables sont
   renseignées.

---

## 11. Migration future vers LWS

Quand le budget le permettra, pour héberger sur LWS au lieu de
Vercel/Render :

- **Frontend** : `npm run build` dans `frontend/`, puis uploadez le contenu du
  dossier `frontend/dist/` par FTP dans le répertoire web de votre
  hébergement LWS (hébergement mutualisé classique, le frontend est 100%
  statique).
- **Backend** : LWS propose des hébergements avec Python/WSGI selon la
  formule choisie ; sinon, gardez le backend sur Render (gratuit) et
  n'utilisez LWS que pour le nom de domaine, en le pointant vers Vercel
  (frontend) et Render (backend) via des enregistrements DNS CNAME.

---

## 12. Dépannage courant

| Problème | Solution |
|---|---|
| `CORS` bloqué dans la console du navigateur | Vérifiez que `CORS_ALLOWED_ORIGINS` sur Render contient exactement l'URL Vercel (avec `https://`, sans `/` final). |
| Le frontend affiche des erreurs 404 sur l'API | Vérifiez `VITE_API_URL` dans les variables Vercel — elle doit se terminer par `/api`. |
| `relation does not exist` sur Render | Les migrations n'ont pas tourné — relancez un déploiement ou exécutez `python manage.py migrate` depuis le Shell Render. |
| Fichiers médias disparus après un redéploiement Render | Normal sur le plan gratuit (disque non persistant) — passez à Cloudinary (section 10). |
| `ModuleNotFoundError` au démarrage local | Vérifiez que l'environnement virtuel est activé (`source venv/bin/activate`) avant `pip install`. |
