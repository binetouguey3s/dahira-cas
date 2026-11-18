import { motion } from "motion/react";
import { Compass, Lightbulb, Route } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/layout/Logo";
import { ElementAnime, ListeAnimee } from "@/components/ui/Divers";
import { useParametres } from "@/context/ParametresContext";
import { Traduit } from "@/context/TraductionContext";

export default function Biographie() {
  const { t } = useTranslation();
  const { parametres } = useParametres();

  const sections = [
    { icone: Route, titre: t("biographie.parcours"), texte: parametres.biographie_parcours || t("biographie.texteParcours") },
    { icone: Compass, titre: t("biographie.vision"), texte: parametres.biographie_vision || t("biographie.texteVision") },
    {
      icone: Lightbulb,
      titre: t("biographie.enseignements"),
      texte: parametres.biographie_enseignements || t("biographie.texteEnseignements"),
    },
  ];

  return (
    <AppShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-10 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B3D2E] to-[#1E7A5D] px-6 py-10 text-center text-white md:py-14"
      >
        <div className="motif-etoiles pointer-events-none absolute inset-0" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 18 }}
          className="relative mx-auto mb-5 w-fit"
        >
          <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#D9C89A] to-[#BFA05A] opacity-80 blur-[2px]" />
          {parametres.photo_guide ? (
            <img
              src={parametres.photo_guide}
              alt={parametres.nom_guide}
              className="relative h-36 w-36 rounded-full object-cover ring-4 ring-[#0B3D2E] md:h-44 md:w-44"
            />
          ) : (
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[#0B3D2E] ring-4 ring-[#0B3D2E] md:h-44 md:w-44">
              <Logo taille={88} />
            </div>
          )}
        </motion.div>
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-[#D9C89A]">{t("nav.biographie")}</p>
        <h1 className="relative mt-2 text-3xl font-bold md:text-4xl">{parametres.nom_guide}</h1>
        <p className="relative mx-auto mt-2 max-w-lg text-sm text-white/80">
          <Traduit texte={parametres.titre_guide || t("biographie.titreGuide")} />
        </p>
      </motion.section>

      <ListeAnimee className="relative mx-auto flex max-w-3xl flex-col gap-6">
        <div className="absolute bottom-6 start-6 top-6 hidden w-px bg-gradient-to-b from-accent-primary/40 via-accent-secondary/40 to-transparent md:block" />
        {sections.map(({ icone: Icone, titre, texte }) => (
          <ElementAnime key={titre} className="relative flex gap-5">
            <div className="relative z-10 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-primary text-white shadow-lg shadow-accent-primary/25 md:flex">
              <Icone className="h-5 w-5" />
            </div>
            <div className="flex-1 rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated p-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-text-primary">
                <Icone className="h-5 w-5 text-accent-primary md:hidden" /> {titre}
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-text-secondary">
                <Traduit texte={texte} />
              </p>
            </div>
          </ElementAnime>
        ))}
      </ListeAnimee>
    </AppShell>
  );
}
