# Guide de démarrage, de déploiement et de maintenance

Ce guide décrit comment faire tourner la plateforme en local, comment elle est hébergée en
production, et comment l'entretenir. Pour l'architecture et l'API, voir la
[documentation technique](docs/DOCUMENTATION_TECHNIQUE.md).

## Sommaire

1. [Prérequis](#1-prérequis)
2. [Lancer le projet en local](#2-lancer-le-projet-en-local)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Comptes administrateurs et rôles](#4-comptes-administrateurs-et-rôles)
5. [Hébergement en production](#5-hébergement-en-production)
6. [Services externes](#6-services-externes)
7. [Déployer une modification](#7-déployer-une-modification)
8. [Maintenance courante](#8-maintenance-courante)
9. [Nom de domaine](#9-nom-de-domaine)
10. [Dépannage](#10-dépannage)

---

## 1. Prérequis

- **Python 3.12+** et **Node.js 20+** (avec npm)
- **Git**, un éditeur (VS Code)
- Accès aux comptes du projet : GitHub, Vercel, Render, Neon, Cloudinary, Brevo, DeepL, UptimeRobot

```bash
python --version && node --version && git --version
```

## 2. Lancer le projet en local

### Backend (Django)

```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # Windows : copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

- API : http://127.0.0.1:8000/api/
- Admin Django : http://127.0.0.1:8000/admin/

En local, sans autre réglage : base SQLite, fichiers dans `backend/media/`, e-mails affichés dans
le terminal, pas de traduction automatique.

### Frontend (React)

Dans un second terminal :

```bash
cd frontend
npm install
cp .env.example .env                # VITE_API_URL=http://127.0.0.1:8000/api
npm run dev                         # http://localhost:5173
```

### Vérifications avant d'envoyer du code

```bash
cd backend && python manage.py test && python manage.py makemigrations --check --dry-run
cd frontend && npx tsc -b && npm run build
```

## 3. Variables d'environnement

### Backend (`backend/.env` en local, onglet **Environment** du service Render en production)

| Variable | Obligatoire en production | Rôle |
|---|---|---|
| `SECRET_KEY` | Oui | Clé secrète Django, longue et aléatoire |
| `DEBUG` | Oui (`False`) | Mode débogage (laisser `True` en local) |
| `ALLOWED_HOSTS` | Oui | Ex. `dahira-cas.onrender.com` (`api.<DOMAINE_DAHIRA>` est ajouté automatiquement) |
| `DATABASE_URL` | Oui | URL PostgreSQL Neon (connexion **directe**, sans « -pooler ») ; vide en local = SQLite |
| `CORS_ALLOWED_ORIGINS` | Oui | Autres URL du site, ex. `https://dahira-cas.vercel.app` (sans `/` final) ; `https://www.<DOMAINE_DAHIRA>` et `https://<DOMAINE_DAHIRA>` sont ajoutés automatiquement |
| `DOMAINE_DAHIRA` | Non | Nom de domaine du Dahira (`dahiracas.com` par défaut) |
| `FRONTEND_URL` | Non | URL utilisée dans les e-mails ; par défaut la première origine https de `CORS_ALLOWED_ORIGINS` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Oui | Stockage des photos, audios et vidéos |
| `BREVO_API_KEY` | Oui | Envoi des e-mails (clé API, pas une clé SMTP « xsmtpsib- ») |
| `DEFAULT_FROM_EMAIL` | Oui | Adresse expéditrice, validée dans Brevo |
| `EMAIL_NOM_EXPEDITEUR` | Non | Nom affiché de l'expéditeur |
| `DEEPL_API_KEY` | Non | Traduction automatique (sans clé : textes affichés dans leur langue d'origine) |
| `TACHES_CLE` | Oui | Clé partagée avec le robot GitHub (même valeur que le secret GitHub) |

Ne mettez jamais ces valeurs dans le dépôt : `backend/.env` est ignoré par git.

### Frontend (`frontend/.env` en local, **Settings → Environment Variables** sur Vercel)

| Variable | Rôle |
|---|---|
| `VITE_API_URL` | Adresse de l'API, se terminant par `/api` (production : `https://api.dahiracas.com/api`) |

### GitHub (**Settings → Secrets and variables → Actions**)

| Secret | Rôle |
|---|---|
| `TACHES_CLE` | Même valeur que la variable Render, utilisée par le robot quotidien |

## 4. Comptes administrateurs et rôles

- **Super-administrateur Django** : `python manage.py createsuperuser` (en production : onglet
  **Shell** du service Render). Il accède à `/admin/` et a tous les droits dans l'application.
- **Rôles des membres** : la personne s'inscrit dans l'application, puis l'administrateur général
  lui donne son rôle dans **Administration → Membres** (voir le
  [guide d'administration](docs/GUIDE_ADMINISTRATION.md)).
- En ligne de commande, si besoin :

  ```bash
  python manage.py shell
  ```
  ```python
  from comptes.models import Membre
  m = Membre.objects.get(telephone="+221770000000")
  m.role = "admin_general"   # responsable_finance, oustaz, admin_contenus, membre
  m.save()
  ```

## 5. Hébergement en production

| Élément | Service | Réglages |
|---|---|---|
| Site (frontend) | **Vercel** | Root Directory `frontend`, framework Vite, variable `VITE_API_URL` ; en-têtes de sécurité dans `frontend/vercel.json` |
| API (backend) | **Render** (Web Service gratuit) | Root Directory `backend` ; voir commandes ci-dessous |
| Base de données | **Neon** (PostgreSQL 17, région Europe) | Base `dahira`, rôle dédié ; URL directe dans `DATABASE_URL` |
| Fichiers | **Cloudinary** | Clés dans les variables Render |
| E-mails | **Brevo** (API HTTP) | Clé restreinte « e-mails transactionnels » ; le SMTP est bloqué sur Render gratuit |
| Traduction | **DeepL** (offre gratuite) | Clé dans `DEEPL_API_KEY` |
| Robot quotidien | **GitHub Actions** | `.github/workflows/taches-quotidiennes.yml`, 8 h UTC |
| Réveil du serveur | **UptimeRobot** | Moniteur HTTP sur `https://api.dahiracas.com/api/sante/`, toutes les 5 min |

Commandes du service Render :

```
Build Command : pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
Start Command : gunicorn dahira_backend.wsgi
```

Render est relié au dépôt par l'**application GitHub Render** : sans elle, les `git push` ne
déclenchent aucun déploiement.

## 6. Services externes

### Cloudinary
Dashboard → **Clés API** : copier le **Cloud name** (celui affiché en haut du tableau de bord, pas
le nom de la clé), l'API Key et l'API Secret dans les variables Render.

### Brevo
1. **Paramètres → Clés API** : créer une clé API restreinte aux **e-mails transactionnels**.
2. Domaine **dahiracas.com authentifié** (lignes DNS chez Vercel : `brevo-code` en TXT, DKIM
   `brevo1._domainkey` et `brevo2._domainkey` en CNAME, DMARC `_dmarc` en TXT). Expéditeur :
   `DEFAULT_FROM_EMAIL=no-reply@dahiracas.com`. Les réponses des membres partent vers l'e-mail de
   contact des Paramètres du site.
3. La clé expire au bout d'un an, ou après 90 jours sans envoi : la renouveler à temps.
4. En cas d'erreur 401 dans les journaux Render (« Key not found »), la clé est fausse ou expirée.

### Réception des e-mails @dahiracas.com (ImprovMX)
Service gratuit qui fait suivre tout message reçu sur une adresse @dahiracas.com (alias `*`) vers la
boîte Gmail du Dahira. DNS chez Vercel : `MX 10 mx1.improvmx.com`, `MX 20 mx2.improvmx.com` et
`TXT v=spf1 include:spf.improvmx.com ~all`. L'e-mail de contact des Paramètres du site est
`contact@dahiracas.com` : les réponses des membres aux e-mails du Dahira y arrivent.

### DeepL
Compte API gratuit (500 000 caractères par mois). La clé se termine par `:fx`. Les traductions
sont mémorisées en base : un même texte n'est traduit qu'une fois.

### Robot quotidien (GitHub Actions)
- Onglet **Actions → Tâches quotidiennes** : historique des passages ; **Run workflow** pour le
  lancer à la main.
- Une croix rouge avec « Clé invalide » signifie que `TACHES_CLE` diffère entre GitHub et Render.

### UptimeRobot
Moniteur de type HTTP(s) toutes les 5 minutes sur `/api/sante/`. Il évite les 30 à 60 secondes
d'attente du réveil de Render et prévient par e-mail en cas de panne.

## 7. Déployer une modification

```bash
git checkout main
git pull
# … modifications, tests (section 2) …
git add -A
git commit -m "Description de la modification"
git push
```

Vercel et Render redéploient automatiquement (2 à 5 minutes). Les migrations de base de données
s'appliquent pendant le build Render. Les visiteurs dont la page est ouverte sont rechargés
automatiquement sur la nouvelle version.

## 8. Maintenance courante

| Quand | Quoi |
|---|---|
| Après chaque déploiement | Vérifier le statut sur Render et Vercel, ouvrir le site |
| Chaque mois | Regarder l'onglet Actions (robot vert) et les journaux Render (erreurs) |
| Avant expiration | Renouveler la clé Brevo (une fois par an) |
| Régulièrement | Sauvegarder la base (ci-dessous) ; Neon garde aussi un historique de restauration |

**Sauvegarde manuelle de la base** (depuis `backend/`, avec `DATABASE_URL` pointant vers Neon) :

```bash
python manage.py dumpdata --natural-foreign --natural-primary \
  --exclude contenttypes --exclude auth.permission --exclude sessions \
  --indent 2 > sauvegarde-$(date +%F).json
```

Conservez ce fichier **hors du dépôt** (il contient des données personnelles).

## 9. Nom de domaine

Le domaine **dahiracas.com** est géré par **Vercel** (serveurs de noms `ns1/ns2.vercel-dns.com`).

| Adresse | Rôle | Réglage |
|---|---|---|
| `dahiracas.com` | Renvoie vers www | Domaine du projet Vercel |
| `www.dahiracas.com` | Le site | Domaine principal du projet Vercel |
| `api.dahiracas.com` | L'API | DNS : CNAME → `dahira-cas.onrender.com` ; Render → **Settings → Custom Domains** (certificat HTTPS automatique) |

- `VITE_API_URL` (Vercel) = `https://api.dahiracas.com/api`.
- Côté Django, `DOMAINE_DAHIRA` ajoute automatiquement `api.dahiracas.com` aux hôtes autorisés,
  `https://www.dahiracas.com` et `https://dahiracas.com` aux origines CORS, et sert d'adresse aux
  liens des e-mails.
- Les anciennes adresses (`dahira-cas.vercel.app`, `dahira-cas.onrender.com`) restent valables.
- **Changer d'hébergeur pour l'API** : seule la ligne CNAME `api` change ; le site, les applications
  installées et les documents gardent la même adresse.
- La CSP de `frontend/vercel.json` autorise déjà `api.dahiracas.com` et `dahira-cas.onrender.com`.

## 10. Dépannage

| Problème | Solution |
|---|---|
| Erreur CORS dans le navigateur | `CORS_ALLOWED_ORIGINS` doit contenir exactement l'URL du site (avec `https://`, sans `/` final) |
| Le site affiche des erreurs de connexion à l'API | Vérifier `VITE_API_URL` sur Vercel (doit finir par `/api`) et que Render est en ligne |
| `git push` ne redéploie pas Render | Vérifier que l'application GitHub Render a bien accès au dépôt |
| Première ouverture très lente | Render s'était endormi : vérifier le moniteur UptimeRobot |
| Envoi de photo : « service de stockage indisponible » | Vérifier les variables Cloudinary (le **Cloud name** surtout) |
| E-mails non reçus | Journaux Render ; clé Brevo valide ; regarder les courriers indésirables |
| Traductions absentes | `DEEPL_API_KEY` manquante ou quota mensuel atteint |
| Robot quotidien en rouge | Même valeur de `TACHES_CLE` sur GitHub et Render, puis **Run workflow** |
| `relation does not exist` | Migrations non appliquées : redéployer ou lancer `python manage.py migrate` dans le Shell Render |
| Une fonction marche en local mais pas en ligne | Penser à la CSP de `frontend/vercel.json`, absente en local |
