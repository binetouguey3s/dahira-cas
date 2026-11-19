import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";

/** Pays du monde (codes ISO 3166) avec leur indicatif téléphonique. */
export type CodePays = CountryCode;

export const PAYS_PAR_DEFAUT: CodePays = "SN";

export const CODES_PAYS: CodePays[] = getCountries();

export function indicatif(code: CodePays) {
  return `+${getCountryCallingCode(code)}`;
}

export function estCodePays(valeur: string | null | undefined): valeur is CodePays {
  return !!valeur && (CODES_PAYS as string[]).includes(valeur.toUpperCase());
}

const cacheNoms = new Map<string, Intl.DisplayNames | null>();

function noms(langue: string) {
  if (!cacheNoms.has(langue)) {
    try {
      cacheNoms.set(langue, new Intl.DisplayNames([langue], { type: "region" }));
    } catch {
      cacheNoms.set(langue, null);
    }
  }
  return cacheNoms.get(langue);
}

/** Nom du pays dans la langue de l'interface. Les anciennes valeurs en texte libre sont affichées telles quelles. */
export function nomPays(valeur: string | null | undefined, langue: string) {
  if (!valeur) return "";
  if (!estCodePays(valeur)) return valeur;
  return noms(langue)?.of(valeur.toUpperCase()) ?? valeur;
}

export function drapeau(code: string) {
  return `/drapeaux/${code.toUpperCase()}.svg`;
}

/** Texte simplifié pour la recherche : sans accents ni majuscules. */
export function simplifier(texte: string) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export interface EntreePays {
  code: CodePays;
  nom: string;
  indicatif: string;
  recherche: string;
}

const cacheListes = new Map<string, EntreePays[]>();

/** Tous les pays, triés par nom dans la langue donnée. Recherche possible en français, en anglais ou par indicatif. */
export function listePays(langue: string): EntreePays[] {
  if (!cacheListes.has(langue)) {
    const liste = CODES_PAYS.map((code) => {
      const nom = nomPays(code, langue);
      return {
        code,
        nom,
        indicatif: indicatif(code),
        recherche: simplifier([nom, nomPays(code, "fr"), nomPays(code, "en"), code, indicatif(code)].join(" ")),
      };
    }).sort((a, b) => a.nom.localeCompare(b.nom, langue));
    cacheListes.set(langue, liste);
  }
  return cacheListes.get(langue)!;
}
