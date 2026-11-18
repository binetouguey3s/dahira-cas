import type { Membre } from "@/lib/api";

/** Informations indispensables pour générer une carte de membre complète. */
export const CHAMPS_CARTE = ["photo", "nom_complet", "telephone", "date_naissance", "adresse", "pays"] as const;
export type ChampCarte = (typeof CHAMPS_CARTE)[number];

export function champsManquants(membre: Membre): ChampCarte[] {
  return CHAMPS_CARTE.filter((c) => !String(membre[c] ?? "").trim());
}

export function progressionProfil(membre: Membre) {
  const tous = [...CHAMPS_CARTE, "email", "profession"] as const;
  const remplis = tous.filter((c) => String(membre[c as keyof Membre] ?? "").trim()).length;
  return Math.round((remplis / tous.length) * 100);
}
