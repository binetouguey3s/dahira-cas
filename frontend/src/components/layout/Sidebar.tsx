import { BookOpen, Calendar, Home, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

interface Lien {
  to: string;
  icone: LucideIcon;
  labelKey: string;
}

const liensMembre: Lien[] = [
  { to: "/", icone: Home, labelKey: "nav.accueil" },
  { to: "/mediatheque", icone: BookOpen, labelKey: "nav.mediatheque" },
  { to: "/questions-reponses", icone: Home, labelKey: "nav.qa" },
  { to: "/evenements", icone: Calendar, labelKey: "nav.evenements" },
  { to: "/profil", icone: User, labelKey: "nav.profil" },
];

/** Barre latérale — visible uniquement sur desktop (≥ md), masquée sur mobile. */
export function Sidebar({ liens = liensMembre }: { liens?: Lien[] }) {
  const { t } = useTranslation();
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-2 border-r border-border-default p-4 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-bg-secondary text-[8px] text-text-secondary">
          Logo
        </div>
        <span className="text-sm font-bold text-text-primary">Dahira CAS</span>
      </div>
      {liens.map(({ to, icone: Icone, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold",
              isActive
                ? "bg-accent-primary text-text-inverse"
                : "text-text-primary hover:bg-bg-secondary",
            )
          }
        >
          <Icone size={18} />
          {t(labelKey)}
        </NavLink>
      ))}
    </aside>
  );
}
