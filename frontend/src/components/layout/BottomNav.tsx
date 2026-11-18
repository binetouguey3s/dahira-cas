import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, Grid2x2, HelpCircle, Home, LogIn, LogOut, Play, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { Avatar } from "@/components/ui/Divers";
import { useAuth } from "@/context/AuthContext";
import { LIENS_ADMIN, LIENS_ESPACE, LIENS_PRINCIPAUX, liensVisibles, type LienNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { Controles } from "./Controles";

const RACCOURCIS = [
  { to: "/", icone: Home, labelKey: "nav.accueil" },
  { to: "/mediatheque", icone: Play, labelKey: "nav.mediatheque" },
  { to: "/evenements", icone: Calendar, labelKey: "nav.evenements" },
  { to: "/questions-reponses", icone: HelpCircle, labelKey: "nav.qa" },
];

function GrilleLiens({ titre, liens, onChoisir }: { titre: string; liens: LienNav[]; onChoisir: () => void }) {
  const { t } = useTranslation();
  if (!liens.length) return null;
  return (
    <div className="mb-5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary/70">{titre}</p>
      <div className="grid grid-cols-3 gap-2">
        {liens.map(({ to, icone: Icone, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/admin"}
            onClick={onChoisir}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition-colors",
                isActive
                  ? "border-accent-primary bg-accent-soft text-accent-primary"
                  : "border-border-subtle text-text-primary active:bg-bg-secondary",
              )
            }
          >
            <Icone className="h-5 w-5" />
            {t(labelKey)}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

/** Navigation mobile : barre flottante + panneau « Plus ». */
export function BottomNav() {
  const { t } = useTranslation();
  const { membre, deconnecter } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOuvert(false), [location.pathname]);

  const raccourcis = RACCOURCIS.filter((r) => r.to !== "/questions-reponses" || membre);
  const fermer = () => setOuvert(false);

  return (
    <>
      <nav
        aria-label={t("nav.principale")}
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-center justify-around rounded-[22px] border border-glass-border bg-glass-bg-strong px-1 shadow-[0_12px_40px_-12px_var(--glass-shadow)] backdrop-blur-xl md:hidden"
      >
        {raccourcis.map(({ to, icone: Icone, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold transition-colors",
                isActive ? "text-accent-primary" : "text-text-secondary",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottomnav-actif"
                    className="absolute inset-x-2 inset-y-1 rounded-2xl bg-accent-soft"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icone size={20} className="relative" />
                <span className="relative max-w-full truncate px-1">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setOuvert(true)}
          className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold text-text-secondary"
          aria-haspopup="dialog"
        >
          {membre ? (
            <Avatar nom={membre.nom_complet} photo={membre.photo} taille={22} className="ring-1" />
          ) : (
            <Grid2x2 size={20} />
          )}
          <span>{t("nav.plus")}</span>
        </button>
      </nav>

      <Dialog.Root open={ouvert} onOpenChange={setOuvert}>
        <AnimatePresence>
          {ouvert && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-[#04140f]/50 backdrop-blur-sm md:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.4 }}
                  onDragEnd={(_, info) => info.offset.y > 100 && fermer()}
                  className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[28px] bg-bg-elevated px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl md:hidden"
                >
                  <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border-default/40" />
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <Dialog.Title className="text-lg font-bold text-text-primary">{t("nav.menu")}</Dialog.Title>
                    <Dialog.Description className="sr-only">{t("nav.menu")}</Dialog.Description>
                    <div className="flex items-center gap-2">
                      <Controles />
                      <Dialog.Close
                        aria-label={t("commun.fermer")}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary"
                      >
                        <X className="h-5 w-5" />
                      </Dialog.Close>
                    </div>
                  </div>

                  {membre ? (
                    <Link
                      to="/profil"
                      onClick={fermer}
                      className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-accent-primary to-[#0B3D2E] p-4 text-white"
                    >
                      <Avatar nom={membre.nom_complet} photo={membre.photo} taille={48} className="ring-white/30" />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{membre.nom_complet}</span>
                        <span className="block text-xs text-white/75">
                          {t(`roles.${membre.role}`)} · {membre.carte_numero}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <div className="mb-5 grid grid-cols-2 gap-2">
                      <Link
                        to="/inscription"
                        onClick={fermer}
                        className="flex items-center justify-center gap-2 rounded-xl bg-accent-primary py-3 text-sm font-semibold text-text-inverse"
                      >
                        <UserPlus className="h-4 w-4" /> {t("nav.devenirMembre")}
                      </Link>
                      <Link
                        to="/connexion"
                        onClick={fermer}
                        className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle py-3 text-sm font-semibold text-text-primary"
                      >
                        <LogIn className="h-4 w-4" /> {t("nav.connexion")}
                      </Link>
                    </div>
                  )}

                  <GrilleLiens titre={t("nav.decouvrir")} liens={liensVisibles(LIENS_PRINCIPAUX, membre)} onChoisir={fermer} />
                  <GrilleLiens titre={t("nav.monEspace")} liens={liensVisibles(LIENS_ESPACE, membre)} onChoisir={fermer} />
                  <GrilleLiens titre={t("nav.administration")} liens={liensVisibles(LIENS_ADMIN, membre)} onChoisir={fermer} />

                  {membre && (
                    <button
                      onClick={() => {
                        deconnecter();
                        fermer();
                        navigate("/connexion");
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-status-error/30 py-3 text-sm font-semibold text-status-error"
                    >
                      <LogOut className="h-4 w-4" /> {t("profil.deconnexion")}
                    </button>
                  )}
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
