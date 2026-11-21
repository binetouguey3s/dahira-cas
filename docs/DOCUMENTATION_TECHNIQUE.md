# Documentation technique

Référence pour les développeurs qui maintiennent la plateforme. Installation et déploiement :
[GUIDE_DEMARRAGE.md](../GUIDE_DEMARRAGE.md).

## Sommaire

1. [Architecture](#1-architecture)
2. [Backend (Django)](#2-backend-django)
3. [Modèles de données](#3-modèles-de-données)
4. [API REST](#4-api-rest)
5. [Authentification, rôles et permissions](#5-authentification-rôles-et-permissions)
6. [Règles métier importantes](#6-règles-métier-importantes)
7. [Frontend (React)](#7-frontend-react)
8. [Internationalisation et traduction automatique](#8-internationalisation-et-traduction-automatique)
9. [Fichiers, e-mails et tâches automatiques](#9-fichiers-e-mails-et-tâches-automatiques)
10. [Sécurité](#10-sécurité)
11. [Tests et vérifications](#11-tests-et-vérifications)
12. [Conventions et pièges connus](#12-conventions-et-pièges-connus)

---

## 1. Architecture

```
frontend/ (React SPA) ── build statique ──► Vercel
    │  axios + JWT (VITE_API_URL)
    ▼
backend/ (Django + DRF, gunicorn) ──► Render (Web Service, plan gratuit)
    ├── PostgreSQL ─────────► Neon (connexion directe, sans pooler)
    ├── médias ─────────────► Cloudinary (images, audio/vidéo en « raw/video »)
    ├── e-mails ────────────► API HTTP Brevo (SMTP bloqué sur Render gratuit)
    └── traduction ─────────► API DeepL (clé gratuite « :fx »)

.github/workflows/taches-quotidiennes.yml ── POST /api/finances/taches/ (8 h UTC)
UptimeRobot ── GET /api/sante/ toutes les 5 min (évite la mise en veille de Render)
```

- Chaque `git push` sur `main` redéploie automatiquement Vercel et Render (Render est relié via
  l'application GitHub Render).
- La base de données n'est jamais touchée par `/api/sante/`, pour ne pas consommer le quota de
  calcul de Neon.

## 2. Backend (Django)

Django 6.1, Django REST Framework, SimpleJWT, django-filter, django-cors-headers, whitenoise,
phonenumbers, python-decouple, dj-database-url, django-cloudinary-storage.

| Application | Rôle |
|---|---|
| `dahira_backend` | Réglages, URLs racine, stockage, e-mails Brevo, gestion des erreurs, archives, pagination |
| `comptes` | Membres, inscription / connexion, mot de passe oublié, carte, annuaire, statistiques, e-mails |
| `finances` | Cotisations, rappels, tâches quotidiennes |
| `evenements` | Événements, réservations de bus, passagers, paiements, responsables |
| `mediatheque` | Enseignements audio / vidéo / texte, « j'aime », téléchargements |
| `questions_reponses` | Questions des membres et réponses de l'Oustaz |
| `site_web` | Paramètres du site (singleton), traduction automatique et sa mémoire |
| `notifications` | Journal des notifications (lecture admin) |

Fichiers transverses dans `dahira_backend/` :

| Fichier | Contenu |
|---|---|
| `settings.py` | Configuration par variables d'environnement (voir GUIDE_DEMARRAGE) |
| `archives.py` | `Archivable` (champs `archive_le`, `archive_par`) et `ArchivesMixin` pour les ViewSets |
| `pagination.py` | Pagination par page, `?page_size=` accepté (100 max, 20 par défaut) |
| `stockage.py` | Stockage audio / vidéo, `supprimer_fichier()` tolérant aux erreurs |
| `email_brevo.py` | Backend d'e-mail Django qui appelle l'API HTTP Brevo |
| `erreurs.py` | Gestionnaire d'exceptions DRF (erreurs Cloudinary → 503 lisible) |

## 3. Modèles de données

### comptes.Membre (utilisateur Django personnalisé)
`username` (= téléphone au format E.164), `telephone` (unique), `nom_complet`, `email`,
`profession`, `adresse`, `pays` (code ISO, `SN` par défaut), `photo`, `role`,
`langue_preferee` (fr, en, es, ar), `carte_numero` (FDCAS-xxxxx, généré à la création),
`date_inscription`, `is_active`.

### finances
- **Cotisation** (archivable) : `membre`, `mois`, `annee` (unique ensemble), `montant`,
  `statut` (`paye`, `non_paye`, `en_retard`), `moyen_paiement` (`wave`, `orange_money`, `autre`),
  `reference_transaction`, `date_paiement`.
- **ReglagesRappels** (singleton, pk=1) : `actifs`, `jour_envoi` (1–28), `dernier_envoi_auto`,
  `dernier_envoi_manuel`.

### evenements
- **Evenement** (archivable) : `titre`, `description`, `lieu`, `categorie` (magal, gamou, dahira,
  causerie, nisfou_shabaan, leylatul_khadr, autre), `date`, `reservation_bus_active`, `nb_bus`,
  `places_par_bus`, `prix_place`, `cree_par`.
- **ResponsableBus** : `evenement`, `membre` (unique ensemble), `numero_wave`,
  `numero_orange_money`, `accepte_especes`.
- **ReservationBus** : `evenement`, `membre` (vide si réservée par un responsable pour une
  personne sans compte), `nom_contact`, `telephone_contact`, `acceptee`, `acceptee_par`,
  `annulee`, `annulee_le`, `creee_par`.
- **PassagerBus** : `reservation`, `nom`, `est_titulaire`, `bus_numero`.
- **PaiementBus** : `reservation`, `montant`, `moyen` (`wave`, `orange_money`, `especes`),
  `reference`, `note`, `responsable`, `statut` (`a_verifier`, `valide`, `refuse`), `declare_par`,
  `traite_par`, `traite_le`.

### mediatheque
- **ContenuMedia** (archivable) : `titre`, `description`, `type` (audio, video, texte), `fichier`,
  `url_externe`, `auteur`, `categorie`, `categorie_autre`, `evenement`, `nb_likes`,
  `nb_telechargements`, `date_publication`.
- **Like** : `contenu`, `membre` (unique ensemble).

### questions_reponses
- **Question** (archivable) : `membre`, `theme`, `texte`, `audio`, `statut` (`en_attente`,
  `repondu`).
- **Reponse** : `question` (1–1), `repondant`, `texte`, `audio`.

### site_web
- **Parametres** (singleton) : identité, Guide et biographie, vidéo guide (fichier ou lien),
  citation, contacts et paiement, réseaux sociaux, `mots_non_traduits`.
- **Traduction** : mémoire des traductions (`empreinte` du texte versionné + `langue`).

## 4. API REST

Préfixe `/api/`. Réponses JSON ; les listes sont paginées
(`{count, next, previous, results}`, `?page=` et `?page_size=`).

### Comptes — `/api/comptes/`
| Méthode et chemin | Accès | Description |
|---|---|---|
| `POST inscription/` | Public | Crée un membre (`telephone_confirmation` vérifié) et renvoie les jetons |
| `POST connexion/` | Public | Jetons JWT ; le numéro peut être saisi sous plusieurs formes |
| `POST connexion/rafraichir/` | Public | Nouveau jeton d'accès |
| `GET/PATCH moi/` | Connecté | Profil (photo en multipart) ; inclut `est_responsable_bus` |
| `DELETE moi/photo/` | Connecté | Retire la photo |
| `POST moi/mot-de-passe/` | Connecté | `{ancien, nouveau}` |
| `POST mot-de-passe/oublie/` | Public | `{identifiant}` (téléphone ou e-mail) ; réponse toujours identique |
| `POST mot-de-passe/reinitialiser/` | Public | `{uid, jeton, nouveau}` (lien valable 2 h) |
| `GET carte/<numero>/` | Public | Vérification d'une carte (compte actif uniquement) |
| `GET annuaire/` | Finance, admin contenus, admin général | Liste légère des membres actifs |
| `GET statistiques/` | Connecté | Chiffres du tableau de bord selon le rôle |
| `membres/` (CRUD sans suppression) | Admin général | + `POST membres/<id>/reinitialiser-mot-de-passe/` |

### Finances — `/api/finances/`
| Méthode et chemin | Accès | Description |
|---|---|---|
| `cotisations/` (CRUD) | Lecture : le membre (les siennes) ; écriture : Finance | Filtres `membre`, `statut`, `mois`, `annee` |
| `POST cotisations/generer/` | Finance | `{mois, annee, montant}` |
| `GET/PATCH rappels/` | Finance | Réglages, prochain envoi, aperçu |
| `POST rappels/envoyer/` | Finance | Envoi immédiat (409 si moins de 10 min après le précédent) |
| `POST taches/` | En-tête `X-Cle-Taches` | Tâches quotidiennes (appelé par GitHub Actions) |

### Événements — `/api/evenements/`
| Méthode et chemin | Accès | Description |
|---|---|---|
| `evenements/` (CRUD) | Lecture publique ; écriture admin contenus | `?periode=a_venir|passes`, `categorie` ; écriture de `responsables_ids` |
| `GET evenements/espace-bus/` | Connecté | Événements gérés par l'utilisateur |
| `GET evenements/<id>/gestion-bus/` | Responsable | Bus et passagers, réservations, totaux |
| `reservations-bus/` (GET, POST, PATCH, DELETE) | Connecté | `{evenement, passagers: [{nom, est_titulaire}]}` ; `nom_contact` pour un responsable |
| `POST reservations-bus/<id>/accepter/` | Responsable | Accepte la réservation |
| `POST reservations-bus/<id>/paiements/` | Titulaire ou responsable | Déclare (à vérifier) ou enregistre (validé) un paiement |
| `POST paiements-bus/<id>/valider/` et `.../refuser/` | Responsable | Traite un paiement déclaré |
| `PATCH/DELETE passagers-bus/<id>/` | Responsable | Change de bus, renomme, retire |
| `PATCH responsables-bus/<id>/` | Le responsable lui-même ou admin | Ses numéros de paiement |

### Médiathèque — `/api/mediatheque/`
`contenus/` (lecture publique, écriture Oustaz / admin contenus), filtres `type`, `evenement`,
`auteur`, `categorie`, recherche `search`, tri `ordering` ; actions `aimer/` (connecté) et
`telecharger/` (public).

### Questions — `/api/questions-reponses/`
`questions/` : un membre ne voit que les siennes (`?miennes=1` force ce filtre pour l'Oustaz) ;
`POST questions/<id>/repondre/` réservé à l'Oustaz (texte et / ou audio).

### Site — `/api/site/`
`GET/PATCH parametres/` (lecture publique, écriture Oustaz / admin contenus) ;
`POST traduire/` `{textes, langue}` → `{traductions, active, version}`.

### Archives (communes aux ViewSets archivables)
Sur `evenements/`, `contenus/`, `questions/` et `cotisations/` :

| Requête | Effet |
|---|---|
| `DELETE <id>/` | Met aux archives (`archive_le`, `archive_par`) |
| `GET ?archives=1` | Liste des éléments archivés (rôle autorisé uniquement) |
| `POST <id>/restaurer/` | Retire des archives |
| `DELETE <id>/definitif/` | Suppression définitive (et du fichier pour un enseignement) |

### Divers
`GET /api/sante/` → `{"ok": true}`, sans accès à la base.

## 5. Authentification, rôles et permissions

- JWT (SimpleJWT) : en-tête `Authorization: Bearer <access>`. Le frontend rafraîchit le jeton
  automatiquement et met à jour le profil quand l'onglet redevient actif.
- Rôles : `membre`, `responsable_finance`, `oustaz`, `admin_contenus`, `admin_general`.
  `is_staff` (super-admin Django) a tous les droits.
- Groupes de rôles (`comptes/permissions.py`) :
  `ROLES_FINANCE`, `ROLES_CONTENUS`, `ROLES_EVENEMENTS`, `ROLES_OUSTAZ`, `ROLES_ADMIN_GENERAL`.
- Responsable des bus : `evenements/bus.py::est_responsable()` (admin contenus / général, ou
  membre présent dans `ResponsableBus` pour l'événement).
- Les noms et numéros des responsables ne sont renvoyés qu'aux utilisateurs connectés.

## 6. Règles métier importantes

**Téléphone** (`comptes/telephone.py`) : normalisé en E.164 (région par défaut SN). À la connexion,
`identifiants_possibles()` essaie plusieurs formes (+221…, 221…, numéro national), ce qui gère les
comptes anciens enregistrés autrement.

**Réservation de bus** (`evenements/bus.py`) :
- places attribuées une par une, du bus 1 au dernier ; un groupe peut être découpé ;
- verrou `select_for_update` sur l'événement à chaque attribution (pas de surréservation) ;
- 10 passagers maximum par réservation ; une seule réservation active par membre et par événement ;
- le membre modifie ou annule tant qu'aucun paiement n'est validé ;
- annulation sans paiement → suppression ; avec paiements → réservation conservée « annulée »,
  places libérées, paiements à vérifier refusés ;
- statut calculé : `annulee`, `payee`, `acompte`, `acceptee`, `en_attente`.

**Cotisations** (`finances/rappels.py`) : `taches_quotidiennes()` est idempotente — génère le mois,
passe les mois précédents en retard, envoie les rappels une fois par mois à partir du jour choisi
(rattrapage si le robot a manqué un jour).

**Archives** : tout ce qui est archivé est exclu des listes, des statistiques et des rappels.

## 7. Frontend (React)

React 19, TypeScript, Vite, Tailwind CSS v4, Motion (animations), Radix UI (dialogues, popovers),
i18next, React Router 7, axios, libphonenumber-js, html-to-image, qrcode, simple-icons,
country-flag-icons.

```
src/
├── App.tsx              Routes (pages chargées à la demande), fournisseurs de contexte
├── main.tsx             Démarrage, écran d'accueil, rechargement si nouvelle version
├── index.css            Jetons de design clair / sombre, styles d'impression
├── context/             Auth, Thème, Paramètres du site, Traduction, Messages (toasts)
├── lib/                 api.ts (client et types), navigation, pays, catégories, utilitaires
├── i18n/locales/        fr.json, en.json, es.json, ar.json
├── components/ui/       Button, Card, Input, Modal, Pagination, TelephoneInput, SelecteurPays…
├── components/layout/   AppShell, Sidebar, BottomNav, Controles, BandeauHorsLigne
├── components/metier/   Carte de membre, archives, bus, réseaux sociaux, vidéo guide…
└── pages/               Une page par écran ; pages/admin pour l'administration
```

Points clés :
- **Pagination** : `components/ui/Pagination.tsx` — `usePageServeur` (pages demandées à l'API,
  10 par page) et `usePageLocale` (liste déjà chargée).
- **Navigation** : `lib/navigation.ts` définit les liens par rôle ; `visible()` affiche
  l'Espace bus aux seuls responsables.
- **Écran d'accueil** : HTML / CSS dans `index.html` ; `main.tsx` le retire après 5 s à la première
  ouverture de la session, 1,5 s à l'actualisation (`sessionStorage`).
- **Nouvelle version déployée** : `lib/chargement.ts` recharge la page si un fichier d'une ancienne
  version est introuvable.
- **Carte de membre** : `pages/Carte.tsx` capture recto / verso avec html-to-image (images décodées,
  trois passages pour Safari), puis partage (`navigator.share`) sur téléphone ou téléchargement.
- **Mode sombre** : jetons `[data-theme="dark"]` dans `index.css` ; classe `.bandeau-vert` pour les
  grands bandeaux.

## 8. Internationalisation et traduction automatique

- Textes d'interface : `src/i18n/locales/*.json` (fr, en, es, ar). L'arabe passe la page en `dir="rtl"`.
  Pluriels arabes : suffixes `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`.
- Textes saisis par les utilisateurs : composant `<Traduit>` / `useTraduit()`, qui regroupe les
  textes visibles et appelle `POST /api/site/traduire/`. Le navigateur garde une mémoire
  (`localStorage`), vidée quand la `version` renvoyée par le serveur change.
- Côté serveur (`site_web/traduction.py`) :
  - les termes protégés sont entourés de `<x>…</x>` et ignorés par DeepL (`tag_handling=xml`) ;
  - protégés : termes religieux (forme arabe substituée après traduction), lieux wolof
    (« Keur … », « Darou … », « Kourel »), noms et prénoms courants (sensibles à la casse),
    années, et la liste `Parametres.mots_non_traduits` ;
  - « an 2026 », « year 2026 », « عام 2026 », « 2026م » sont ramenés à « 2026 » ;
  - mémoire en base (`Traduction`), clé = empreinte de `VERSION_TRADUCTION` + liste de mots + texte.
    **Changer une règle de traduction ⇒ incrémenter `VERSION_TRADUCTION`.**
- Le lieu des événements n'est jamais envoyé à la traduction.

## 9. Fichiers, e-mails et tâches automatiques

**Fichiers** : Cloudinary dès que `CLOUDINARY_*` est défini, sinon disque local (`media/`). Les
suppressions passent par `supprimer_fichier()` pour ne jamais bloquer une action si Cloudinary
répond mal. Taille maximale côté serveur : 100 Mo pour les médias.

**E-mails** (`comptes/emails.py`) : bienvenue, réinitialisation du mot de passe, rappel de cotisation,
en 4 langues (HTML aux couleurs du Dahira, sens RTL en arabe). Envoi en arrière-plan via l'API
Brevo (`BREVO_API_KEY`) ; sans clé, les e-mails s'affichent dans la console.

**Robot quotidien** : `.github/workflows/taches-quotidiennes.yml`, chaque jour à 8 h UTC et à la
demande (« Run workflow »). Il appelle `POST /api/finances/taches/` avec l'en-tête
`X-Cle-Taches` = secret GitHub `TACHES_CLE` (même valeur que la variable Render).

## 10. Sécurité

- Limitation des requêtes (DRF) : anonymes 120/min, connectés 600/min, connexion 10/min,
  inscription 20/h, mot de passe oublié 5/h, traduction 120/min.
- Mot de passe oublié : réponse identique que le compte existe ou non ; lien à usage unique, 2 h.
- Production : HTTPS forcé, HSTS 1 an, cookies sécurisés, `SECURE_REFERRER_POLICY`.
- Frontend (`frontend/vercel.json`) : Content-Security-Policy stricte (scripts du site uniquement,
  `connect-src` limité à l'API, Cloudinary et Google Fonts ; pas de `data:`), `X-Frame-Options`,
  `Permissions-Policy` (caméra et micro pour le site seul).
- Validation des fichiers envoyés (type et taille), numéros de téléphone et pays.
- Les secrets ne sont jamais dans le dépôt (`backend/.env` est ignoré par git).

## 11. Tests et vérifications

```bash
cd backend && python manage.py test          # tests du backend
cd frontend && npx tsc -b && npm run build   # types et build du frontend
```

Les tests couvrent notamment : téléphone et connexion, e-mails, archives, pagination, réservation
de bus (attribution, paiements, droits), traduction protégée, rappels et tâches quotidiennes.

Pour tester une fonctionnalité navigateur dans les conditions réelles, appliquer la CSP de
`vercel.json` (elle n'existe pas avec `vite preview`).

## 12. Conventions et pièges connus

- Le code, les commentaires et les messages sont **en français**.
- Nouvelle clé d'interface : l'ajouter dans **les 4 fichiers de langue**.
- `useEffect` : toujours écrire le corps entre accolades. Dans Chrome récent,
  `window.scrollTo()` renvoie une promesse ; `useEffect(() => window.scrollTo(…))` la renvoyait à
  React et cassait toute la navigation.
- Pas de `fetch()` sur une adresse `data:` : la CSP la bloque en production.
- Grilles responsives : utiliser `grid-cols-1` sur mobile (sinon une colonne implicite peut
  déborder de l'écran).
- Modèle archivable : hériter de `Archivable`, ajouter `ArchivesMixin` au ViewSet, appeler
  `filtrer_archives()` dans `get_queryset()`, et exclure `archive_le__isnull=False` dans toute
  requête annexe (statistiques, tâches).
- Neon : utiliser l'URL **directe** (sans « -pooler »).
