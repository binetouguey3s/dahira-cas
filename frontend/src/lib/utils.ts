import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import i18n from "@/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES", ar: "ar-SN" };

export function locale() {
  return LOCALES[i18n.language] ?? "fr-FR";
}

export function formatDate(date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(locale(), options ?? { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateHeure(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMois(mois: number, annee: number) {
  return new Date(annee, mois - 1, 1).toLocaleDateString(locale(), { month: "long", year: "numeric" });
}

export function formatMontant(montant: number | string | null | undefined) {
  return `${Number(montant ?? 0).toLocaleString(locale())} FCFA`;
}

/** Date au format attendu par <input type="datetime-local"> (heure locale). */
export function versDatetimeLocal(date: string | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const decalage = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - decalage).toISOString().slice(0, 16);
}

/** Convertit un lien YouTube/Vimeo classique en lien intégrable dans un lecteur. */
export function lienIntegrable(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const hote = u.hostname.replace(/^www\.|^m\./, "");
    if (hote === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (hote === "youtube.com") {
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (hote === "vimeo.com") return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}`;
    if (hote === "player.vimeo.com") return url;
  } catch {
    return null;
  }
  return null;
}

export function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join("");
}
