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

// Écran d'accueil (logo animé, défini dans index.html) : 5 s à la première ouverture du site,
// 1,5 s quand on actualise pendant la même visite (pour ne pas ralentir ceux qui travaillent dessus).
// Plus court si les animations sont réduites.
const CLE_DEJA_OUVERT = "dahira_ecran_accueil_vu";

function dejaOuvert() {
  try {
    const vu = sessionStorage.getItem(CLE_DEJA_OUVERT) === "1";
    sessionStorage.setItem(CLE_DEJA_OUVERT, "1");
    return vu;
  } catch {
    return false;
  }
}

function retirerEcranAccueil() {
  const ecran = document.getElementById("ecran-accueil");
  if (!ecran) return;
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dureeMinimale = reduit ? 900 : dejaOuvert() ? 1500 : 5000;
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
