import { BookOpen, Calendar, HelpCircle, Home, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const liens = [
  { to: "/", icone: Home, labelKey: "nav.accueil" },
  { to: "/mediatheque", icone: BookOpen, labelKey: "nav.mediatheque" },
  { to: "/questions-reponses", icone: HelpCircle, labelKey: "nav.qa" },
  { to: "/evenements", icone: Calendar, labelKey: "nav.evenements" },
  { to: "/profil", icone: User, labelKey: "nav.profil" },
];

/** Barre de navigation pilule flottante — visible uniquement sur mobile (< md). */
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("nav.accueil")}
      className="fixed inset-x-4 bottom-4 z-20 flex h-16 items-center justify-around rounded-full border border-glass-border bg-glass-bg shadow-lg backdrop-blur-md md:hidden"
    >
      {liens.map(({ to, icone: Icone, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 text-[11px]",
              isActive ? "text-accent-primary" : "text-text-secondary",
            )
          }
        >
          <Icone size={20} />
          <span>{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
