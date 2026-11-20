import type { CategorieEvenement } from "@/lib/api";

/** Catégories communes aux événements et aux médias (dans l'ordre d'affichage). */
export const CATEGORIES: CategorieEvenement[] = [
  "magal",
  "gamou",
  "dahira",
  "causerie",
  "nisfou_shabaan",
  "leylatul_khadr",
  "autre",
];

/** Libellé d'une catégorie ; pour « Autre », la précision saisie par l'admin si elle existe. */
export function libelleCategorie(
  t: (cle: string) => string,
  categorie: CategorieEvenement | "" | null | undefined,
  precision?: string,
) {
  if (!categorie) return "";
  if (categorie === "autre" && precision?.trim()) return precision.trim();
  return t(`evenements.categories.${categorie}`);
}
