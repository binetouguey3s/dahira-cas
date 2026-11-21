# Frontend — application React

Application web mobile-first de la plateforme du Dahira (React 19, TypeScript, Vite,
Tailwind CSS v4, Motion, i18next).

```bash
npm install
cp .env.example .env     # VITE_API_URL=http://127.0.0.1:8000/api
npm run dev              # http://localhost:5173
npx tsc -b               # vérification des types
npm run build            # build de production dans dist/
```

| Dossier | Contenu |
|---|---|
| `src/pages/` | Une page par écran ; `src/pages/admin/` pour l'administration |
| `src/components/ui/` | Composants de base (boutons, champs, fenêtres, pagination…) |
| `src/components/layout/` | Coquille : menu latéral, barre du bas, contrôles langue / thème, bandeau hors connexion |
| `src/components/metier/` | Carte de membre, réservation de bus, archives, réseaux sociaux… |
| `src/context/` | Authentification, thème, paramètres du site, traduction, messages |
| `src/lib/` | Client API et types, navigation par rôle, pays, utilitaires |
| `src/i18n/locales/` | Textes en français, anglais, espagnol et arabe |
| `vercel.json` | En-têtes de sécurité (CSP) et cache en production |

Toute nouvelle clé de texte doit être ajoutée dans les **4 fichiers de langue**.

Documentation complète : [`../docs/DOCUMENTATION_TECHNIQUE.md`](../docs/DOCUMENTATION_TECHNIQUE.md).
