import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "motion/react";
import { Check, Globe, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { changerLangue, LANGUES, NOMS_LANGUES, type Langue } from "@/i18n";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function SelecteurLangue({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const { membre } = useAuth();
  const actuelle = (i18n.language as Langue) ?? "fr";

  const choisir = (langue: Langue) => {
    changerLangue(langue);
    // On mémorise aussi le choix dans le profil, pour les autres appareils et les notifications.
    if (membre && membre.langue_preferee !== langue) {
      api.patch("/comptes/moi/", { langue_preferee: langue }).catch(() => undefined);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={t("commun.langue")}
          className="flex h-10 items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent-primary"
        >
          <Globe className="h-4 w-4 text-accent-primary" />
          {compact ? actuelle.toUpperCase() : NOMS_LANGUES[actuelle]?.nom}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[60] min-w-[180px] rounded-2xl border border-border-subtle bg-bg-elevated p-1.5 shadow-xl data-[state=open]:animate-[apparition_.15s_ease-out]"
        >
          {LANGUES.map((l) => (
            <DropdownMenu.Item
              key={l}
              onSelect={() => choisir(l)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-secondary",
                l === actuelle && "font-semibold",
              )}
            >
              <span className="w-6 text-xs font-bold uppercase text-text-secondary">{l}</span>
              <span className="flex-1">{NOMS_LANGUES[l].nom}</span>
              {l === actuelle && <Check className="h-4 w-4 text-accent-primary" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function BoutonTheme() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={t("commun.theme")}
      className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-bg-elevated transition-colors hover:border-accent-primary"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          {theme === "light" ? (
            <Sun className="h-4 w-4 text-accent-secondary" />
          ) : (
            <Moon className="h-4 w-4 text-accent-secondary" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function Controles({ compact = true }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <SelecteurLangue compact={compact} />
      <BoutonTheme />
    </div>
  );
}
