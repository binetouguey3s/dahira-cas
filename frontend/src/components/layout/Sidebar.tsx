import { motion } from "motion/react";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { Avatar } from "@/components/ui/Divers";
import { useAuth } from "@/context/AuthContext";
import { useParametres } from "@/context/ParametresContext";
import { LIENS_ADMIN, LIENS_ESPACE, LIENS_PRINCIPAUX, liensVisibles, type LienNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { Logo } from "./Logo";

function Section({ titre, liens }: { titre?: string; liens: LienNav[] }) {
  const { t } = useTranslation();
  if (!liens.length) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {titre && (
        <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary/70">
          {titre}
        </p>
      )}
      {liens.map(({ to, icone: Icone, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/" || to === "/admin"}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              isActive ? "text-text-inverse" : "text-text-primary hover:bg-bg-secondary",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="sidebar-actif"
                  className="absolute inset-0 rounded-xl bg-accent-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icone size={18} className="relative" />
              <span className="relative">{t(labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

/** Barre latérale — visible sur ordinateur et tablette (≥ md). */
export function Sidebar() {
  const { t } = useTranslation();
  const { membre, deconnecter } = useAuth();
  const { parametres } = useParametres();
  const navigate = useNavigate();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-border-subtle bg-bg-elevated/60 px-3 py-5 backdrop-blur md:flex">
      <Link to="/" className="mb-4 flex items-center gap-3 px-2">
        <Logo taille={42} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold leading-tight text-text-primary">{parametres.nom_dahira}</span>
          <span className="block text-xs font-semibold tracking-widest text-accent-secondary-text">{parametres.sigle}</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col overflow-y-auto no-scrollbar" aria-label={t("nav.principale")}>
        <Section liens={liensVisibles(LIENS_PRINCIPAUX, membre)} />
        <Section titre={t("nav.monEspace")} liens={liensVisibles(LIENS_ESPACE, membre)} />
        <Section titre={t("nav.administration")} liens={liensVisibles(LIENS_ADMIN, membre)} />
      </nav>

      {membre ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-elevated p-2.5">
          <Link to="/profil" className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar nom={membre.nom_complet} photo={membre.photo} taille={38} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">{membre.nom_complet}</span>
              <span className="block truncate text-xs text-text-secondary">{t(`roles.${membre.role}`)}</span>
            </span>
          </Link>
          <button
            onClick={() => {
              deconnecter();
              navigate("/connexion");
            }}
            aria-label={t("profil.deconnexion")}
            title={t("profil.deconnexion")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-status-error-bg hover:text-status-error"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <Link
            to="/inscription"
            className="flex items-center justify-center gap-2 rounded-xl bg-accent-primary px-3 py-2.5 text-sm font-semibold text-text-inverse transition hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" /> {t("nav.devenirMembre")}
          </Link>
          <Link
            to="/connexion"
            className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle px-3 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-bg-secondary"
          >
            <LogIn className="h-4 w-4" /> {t("nav.connexion")}
          </Link>
        </div>
      )}
    </aside>
  );
}
