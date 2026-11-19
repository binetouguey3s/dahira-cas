import { lazy, type ComponentType } from "react";

const CLE = "dahira_rechargement";

/**
 * Après une mise en ligne, les fichiers de l'ancienne version disparaissent : un onglet resté ouvert
 * ne peut plus charger la page suivante. On recharge alors automatiquement le site (une seule fois
 * par minute, pour ne jamais boucler si le serveur est réellement injoignable).
 */
export function rechargerVersNouvelleVersion(): boolean {
  let dernier = 0;
  try {
    dernier = Number(sessionStorage.getItem(CLE) || 0);
  } catch {
    /* stockage indisponible */
  }
  if (Date.now() - dernier < 60_000) return false;
  try {
    sessionStorage.setItem(CLE, String(Date.now()));
  } catch {
    /* stockage indisponible */
  }
  window.location.reload();
  return true;
}

/** `React.lazy` qui recharge le site si la page demandée appartient à une ancienne version. */
export function lazyPage<T extends ComponentType<object>>(importer: () => Promise<{ default: T }>) {
  const attendreRechargement = () => new Promise<{ default: T }>(() => {});
  return lazy(() =>
    importer().then(
      // Module absent : le rechargement est déjà lancé (évènement « vite:preloadError »), on attend.
      (module) => module ?? attendreRechargement(),
      (erreur) => {
        if (rechargerVersNouvelleVersion()) return attendreRechargement();
        throw erreur;
      },
    ),
  );
}
