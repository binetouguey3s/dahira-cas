# Dahira Cheikh Abdoulahi Seye — Frontend (React + Vite)

Application web mobile-first (React 19 + TypeScript + Tailwind v4) consommant
l'API Django décrite dans `../backend/README.md`.

## Démarrage local

```bash
npm install
cp .env.example .env     # ajustez VITE_API_URL si besoin
npm run dev              # http://localhost:5173
```

Le backend Django doit tourner sur `http://127.0.0.1:8000` (valeur par défaut
de `VITE_API_URL`), sinon modifiez `.env`.

## Build de production

```bash
npm run build     # génère dist/
npm run preview    # prévisualise le build localement
```

## Structure

- `src/pages/` — une page par écran (Accueil, Mediatheque, Profil, Cotisations,
  QuestionsReponses, Evenements, Biographie, Connexion, Inscription…) et
  `src/pages/admin/` pour les écrans réservés aux rôles Finance / Oustaz / Admin.
- `src/components/ui/` — primitives réutilisables (Button, Card, Input…).
- `src/components/layout/` — coquille d'application (Sidebar desktop,
  BottomNav mobile, AppShell, contrôles langue/thème).
- `src/context/` — `AuthContext` (JWT, profil) et `ThemeContext` (clair/sombre).
- `src/i18n/` — traductions FR / EN / AR (avec bascule RTL automatique pour
  l'arabe) ; voir `src/i18n/locales/*.json`.
- `src/lib/api.ts` — client axios (ajoute automatiquement le jeton JWT) et les
  types TypeScript correspondant aux modèles Django.
- `src/index.css` — design tokens (couleurs, typographie) clair/sombre repris
  des maquettes Claude Design du projet.

## Rôles et routes protégées

`ProtectedRoute` (dans `src/components/ProtectedRoute.tsx`) redirige vers
`/connexion` si l'utilisateur n'est pas connecté, et vers `/` si son rôle ne
correspond pas à la route (ex. `/admin/finance` réservé à
`responsable_finance` / `admin_general`).

## Déploiement sur Vercel

Voir le guide complet à la racine du projet : `../GUIDE_DEMARRAGE.md`.
Résumé :

1. Pousser ce dossier (avec le reste du repo) sur GitHub.
2. Sur [vercel.com](https://vercel.com), importer le repo, choisir le dossier
   `frontend` comme *Root Directory*.
3. Ajouter la variable d'environnement `VITE_API_URL` pointant vers le backend
   déployé (Render).
4. Déployer — Vercel détecte automatiquement Vite (`npm run build`, dossier
   `dist`).
