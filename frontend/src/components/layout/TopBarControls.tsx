import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/context/ThemeContext";
import { LANGUES, changerLangue, type Langue } from "@/i18n";

/** Les deux boutons présents en haut de chaque écran : langue (FR→EN→AR) et clair/sombre. */
export function TopBarControls() {
  const { i18n, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const langueActuelle = i18n.language as Langue;

  const cyclerLangue = () => {
    const index = LANGUES.indexOf(langueActuelle);
    const suivante = LANGUES[(index + 1) % LANGUES.length];
    changerLangue(suivante);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={cyclerLangue}
        aria-label={t("commun.langue")}
        className="h-9 rounded-full bg-bg-secondary px-3 text-xs font-semibold text-text-primary"
      >
        {langueActuelle.toUpperCase()}
      </button>
      <button
        onClick={toggleTheme}
        aria-label={t("commun.theme")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-bg-elevated"
      >
        {theme === "light" ? (
          <Sun size={16} className="text-accent-secondary" />
        ) : (
          <Moon size={16} className="text-accent-secondary" />
        )}
      </button>
    </div>
  );
}
