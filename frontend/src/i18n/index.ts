import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./locales/ar.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

export const LANGUES = ["fr", "en", "es", "ar"] as const;
export type Langue = (typeof LANGUES)[number];

export const NOMS_LANGUES: Record<Langue, { nom: string; drapeau: string }> = {
  fr: { nom: "Français", drapeau: "🇫🇷" },
  en: { nom: "English", drapeau: "🇬🇧" },
  es: { nom: "Español", drapeau: "🇪🇸" },
  ar: { nom: "العربية", drapeau: "🇸🇦" },
};

function langueInitiale(): Langue {
  let enregistree: string | null = null;
  try {
    enregistree = localStorage.getItem("dahira_langue");
  } catch {
    /* stockage indisponible */
  }
  if (enregistree && (LANGUES as readonly string[]).includes(enregistree)) return enregistree as Langue;
  const navigateur = navigator.language?.slice(0, 2);
  return (LANGUES as readonly string[]).includes(navigateur) ? (navigateur as Langue) : "fr";
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    es: { translation: es },
    ar: { translation: ar },
  },
  lng: langueInitiale(),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

function appliquerDirection(langue: Langue) {
  document.documentElement.dir = langue === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = langue;
}

export function changerLangue(langue: Langue) {
  i18n.changeLanguage(langue);
  try {
    localStorage.setItem("dahira_langue", langue);
  } catch {
    /* stockage indisponible */
  }
  appliquerDirection(langue);
}

appliquerDirection(i18n.language as Langue);

export default i18n;
