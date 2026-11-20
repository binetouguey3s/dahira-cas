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

// Écran d'accueil (logo animé, défini dans index.html) : visible 5 s à chaque ouverture
// du site, puis il s'efface sur la page demandée. Plus court si les animations sont réduites.
function retirerEcranAccueil() {
  const ecran = document.getElementById("ecran-accueil");
  if (!ecran) return;
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dureeMinimale = reduit ? 900 : 5000;
  window.setTimeout(() => {
    ecran.classList.add("sortie");
    window.setTimeout(() => ecran.remove(), 650);
  }, Math.max(0, dureeMinimale - performance.now()));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

retirerEcranAccueil();
