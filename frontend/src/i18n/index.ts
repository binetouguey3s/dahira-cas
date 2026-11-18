import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./locales/ar.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

export const LANGUES = ["fr", "en", "ar"] as const;
export type Langue = (typeof LANGUES)[number];

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: localStorage.getItem("dahira_langue") ?? "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export function changerLangue(langue: Langue) {
  i18n.changeLanguage(langue);
  localStorage.setItem("dahira_langue", langue);
  document.documentElement.dir = langue === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = langue;
}

// Applique la direction au chargement initial.
changerLangue((localStorage.getItem("dahira_langue") as Langue) ?? "fr");

export default i18n;
