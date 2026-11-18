import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Traduit } from "@/context/TraductionContext";
import { useParametres } from "@/context/ParametresContext";

import { Controles } from "./Controles";
import { Logo } from "./Logo";

/** Habillage des écrans de connexion / inscription. */
export function AuthLayout({ titre, sousTitre, children }: { titre: string; sousTitre: string; children: ReactNode }) {
  const { t } = useTranslation();
  const { parametres } = useParametres();
  const citation = parametres.citation_du_jour || t("accueil.citationParDefaut");

  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary md:flex-row">
      <div className="relative flex flex-col justify-between gap-8 overflow-hidden bg-gradient-to-br from-[#0B3D2E] via-[#145c45] to-[#1E7A5D] p-8 text-white md:w-[46%] md:p-12">
        <div className="motif-etoiles pointer-events-none absolute inset-0" />
        <motion.div
          className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[#D9C89A]/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <Link to="/" className="relative flex items-center gap-3">
          <Logo taille={48} />
          <span>
            <span className="block text-lg font-bold leading-tight">{parametres.nom_dahira}</span>
            <span className="block text-xs font-semibold tracking-[0.2em] text-[#D9C89A]">{parametres.sigle}</span>
          </span>
        </Link>
        <motion.blockquote
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative hidden max-w-md md:block"
        >
          <span className="font-serif text-6xl leading-none text-[#D9C89A]/60">“</span>
          <p className="-mt-4 font-serif text-2xl leading-relaxed">
            <Traduit texte={citation} />
          </p>
          <footer className="mt-4 text-sm text-white/70">— {parametres.citation_auteur || parametres.nom_guide}</footer>
        </motion.blockquote>
        <p className="relative max-w-sm text-sm text-white/80 md:hidden">{sousTitre}</p>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="absolute end-4 top-4">
          <Controles />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{titre}</h1>
          <p className="mb-6 mt-1 hidden text-sm text-text-secondary md:block">{sousTitre}</p>
          <div className="md:mt-0 mt-5">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
