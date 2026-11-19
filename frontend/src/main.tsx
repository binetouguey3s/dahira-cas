import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./i18n";
import "./index.css";
import App from "./App.tsx";
import { rechargerVersNouvelleVersion } from "./lib/chargement";

// Fichier d'une ancienne version introuvable (site mis à jour entre-temps) : rechargement automatique.
window.addEventListener("vite:preloadError", (evenement) => {
  if (rechargerVersNouvelleVersion()) evenement.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
