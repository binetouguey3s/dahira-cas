import type { Membre } from "@/lib/api";

/** Seuls le nom et prénom et la photo sont obligatoires pour la carte de membre. */
export const CHAMPS_CARTE = ["photo", "nom_complet"] as const;
export type ChampCarte = (typeof CHAMPS_CARTE)[number];

export function champsManquants(membre: Membre): ChampCarte[] {
  return CHAMPS_CARTE.filter((c) => !String(membre[c] ?? "").trim());
}

export function progressionProfil(membre: Membre) {
  const tous = ["photo", "nom_complet", "telephone", "adresse", "pays", "email", "profession"] as const;
  const remplis = tous.filter((c) => String(membre[c] ?? "").trim()).length;
  return Math.round((remplis / tous.length) * 100);
}
