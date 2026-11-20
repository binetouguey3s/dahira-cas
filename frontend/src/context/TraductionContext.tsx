import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";

/**
 * Traduction automatique des textes écrits par les utilisateurs (événements,
 * enseignements, questions…) dans la langue choisie par le visiteur.
 *
 * Les textes visibles sont regroupés et envoyés en un seul appel à
 * /api/site/traduire/, qui garde lui-même une mémoire des traductions.
 * Le navigateur garde aussi les traductions déjà reçues.
 */

type Memoire = Record<string, Record<string, string>>; // langue → texte source → traduction

const CLE_STOCKAGE = "dahira_traductions_v2";
const CLE_VERSION = "dahira_traductions_version";
const MAX_PAR_LANGUE = 800;
const TAILLE_LOT = 50;

function chargerMemoire(): Memoire {
  try {
    return JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? "{}") as Memoire;
  } catch {
    return {};
  }
}

function lireVersion() {
  try {
    return localStorage.getItem(CLE_VERSION);
  } catch {
    return null;
  }
}

function ecrireVersion(version: string) {
  try {
    localStorage.setItem(CLE_VERSION, version);
  } catch {
    /* indisponible */
  }
}

function sauverMemoire(memoire: Memoire) {
  try {
    const allegee: Memoire = {};
    for (const [langue, textes] of Object.entries(memoire)) {
      allegee[langue] = Object.fromEntries(Object.entries(textes).slice(-MAX_PAR_LANGUE));
    }
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(allegee));
  } catch {
    /* stockage plein ou indisponible : on garde seulement en mémoire vive */
  }
}

interface TraductionContextValue {
  traduire: (texte: string) => string;
  demander: (texte: string) => void;
}

const TraductionContext = createContext<TraductionContextValue | undefined>(undefined);

export function TraductionProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const langue = i18n.language;
  const memoire = useRef<Memoire>(chargerMemoire());
  const enAttente = useRef<Set<string>>(new Set());
  const enCours = useRef<Set<string>>(new Set());
  const minuterie = useRef<number | null>(null);
  const serviceActif = useRef(true);
  const [, setVersion] = useState(0);

  const envoyer = useCallback(async () => {
    minuterie.current = null;
    const cible = i18n.language;
    const textes = [...enAttente.current];
    enAttente.current.clear();
    if (!textes.length || !serviceActif.current) return;
    textes.forEach((t) => enCours.current.add(`${cible}|${t}`));

    for (let i = 0; i < textes.length; i += TAILLE_LOT) {
      const lot = textes.slice(i, i + TAILLE_LOT);
      try {
        const { data } = await api.post<{ traductions: string[]; active: boolean; version?: string }>("/site/traduire/", {
          textes: lot,
          langue: cible,
        });
        if (!data.active) {
          serviceActif.current = false;
          return;
        }
        // Règles de traduction changées (ex. nouveaux mots à ne pas traduire) : on oublie les anciennes traductions.
        if (data.version && lireVersion() !== data.version) {
          memoire.current = {};
          ecrireVersion(data.version);
        }
        const pourLangue = (memoire.current[cible] ??= {});
        lot.forEach((t, j) => (pourLangue[t] = data.traductions[j] ?? t));
      } catch {
        // Service indisponible : on affiche le texte d'origine, on réessaiera plus tard.
      } finally {
        lot.forEach((t) => enCours.current.delete(`${cible}|${t}`));
      }
    }
    sauverMemoire(memoire.current);
    setVersion((v) => v + 1);
  }, [i18n]);

  const demander = useCallback(
    (texte: string) => {
      if (!texte?.trim() || !serviceActif.current) return;
      if (memoire.current[langue]?.[texte] !== undefined) return;
      if (enCours.current.has(`${langue}|${texte}`)) return;
      enAttente.current.add(texte);
      if (minuterie.current === null) minuterie.current = window.setTimeout(envoyer, 40);
    },
    [langue, envoyer],
  );

  const traduire = useCallback((texte: string) => memoire.current[langue]?.[texte] ?? texte, [langue]);

  useEffect(() => () => {
    if (minuterie.current !== null) window.clearTimeout(minuterie.current);
  }, []);

  return <TraductionContext.Provider value={{ traduire, demander }}>{children}</TraductionContext.Provider>;
}

/** Renvoie le texte traduit dans la langue du visiteur (ou l'original en attendant). */
export function useTraduit(texte: string | null | undefined): string {
  const ctx = useContext(TraductionContext);
  const valeur = texte ?? "";
  useEffect(() => {
    if (valeur) ctx?.demander(valeur);
  }, [ctx, valeur]);
  return ctx ? ctx.traduire(valeur) : valeur;
}

/** Affiche un texte saisi par un utilisateur, traduit automatiquement. */
export function Traduit({ texte }: { texte: string | null | undefined }) {
  return <>{useTraduit(texte)}</>;
}
