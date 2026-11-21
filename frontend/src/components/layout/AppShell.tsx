import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { useParametres } from "@/context/ParametresContext";

import { BottomNav } from "./BottomNav";
import { Controles } from "./Controles";
import { Logo } from "./Logo";
import { Sidebar } from "./Sidebar";

/** Coquille commune : barre latérale sur ordinateur, barre flottante sur mobile. */
export function AppShell({ children, large = false }: { children: ReactNode; large?: boolean }) {
  const { parametres } = useParametres();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // Pages d'administration (Membres, Finance…) : flèche de retour vers le tableau de bord.
  const sousPageAdmin = pathname.startsWith("/admin/");
  return (
    <div className="flex min-h-dvh bg-bg-primary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre du haut */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border-subtle/60 bg-bg-primary/80 px-4 py-3 backdrop-blur-xl md:justify-end md:border-none md:bg-transparent md:px-10 md:pt-6 md:backdrop-blur-none">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 md:hidden">
            <Logo taille={34} />
            <span className="truncate text-sm font-bold text-text-primary">{parametres.sigle}</span>
          </Link>
          <Controles />
        </header>
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 px-4 pb-32 pt-4 md:px-10 md:pb-14 md:pt-2"
        >
          <div className={large ? "mx-auto max-w-6xl" : "mx-auto max-w-4xl"}>
            {sousPageAdmin && (
              <Link
                to="/admin"
                className="group mb-4 inline-flex items-center gap-1.5 rounded-full py-1 pe-3 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5">
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                </span>
                {t("nav.admin")}
              </Link>
            )}
            {children}
          </div>
        </motion.main>
      </div>
      <BottomNav />
    </div>
  );
}
