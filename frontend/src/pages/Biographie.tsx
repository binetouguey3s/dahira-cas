import { motion } from "motion/react";
import { BookOpen, Compass, Headphones, Lightbulb, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CarteContenu } from "@/components/metier/Elements";
import { aUneVideoGuide, VideoGuide } from "@/components/metier/VideoGuide";
import { api, type ContenuMedia, type Paginated } from "@/lib/api";

import { AppShell } from "@/components/layout/AppShell";
import { ElementAnime, ListeAnimee } from "@/components/ui/Divers";
import { PHOTO_GUIDE_PAR_DEFAUT, useParametres } from "@/context/ParametresContext";
import { Traduit } from "@/context/TraductionContext";

export default function Biographie() {
  const { t } = useTranslation();
  const { parametres } = useParametres();

  const [medias, setMedias] = useState<ContenuMedia[]>([]);

  // Audios et vidéos publiés dans la médiathèque avec « Afficher sur la page Biographie ».
  useEffect(() => {
    api
      .get<Paginated<ContenuMedia>>("/mediatheque/contenus/?sur_biographie=true&ordering=date_publication&page_size=50")
      .then((res) => setMedias(res.data.results))
      .catch(() => setMedias([]));
  }, []);

  // Seules les parties remplies dans les Paramètres du site s'affichent (aucun texte d'exemple).
  const sections = [
    { icone: Route, titre: t("biographie.parcours"), texte: parametres.biographie_parcours },
    { icone: Compass, titre: t("biographie.vision"), texte: parametres.biographie_vision },
    { icone: Lightbulb, titre: t("biographie.enseignements"), texte: parametres.biographie_enseignements },
  ].filter((s) => s.texte?.trim());
  const pageVide = !sections.length && !medias.length && !aUneVideoGuide(parametres);

  return (
    <AppShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bandeau-vert relative mb-10 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B3D2E] to-[#1E7A5D] px-6 py-10 text-center text-white md:py-14"
      >
        <div className="motif-etoiles pointer-events-none absolute inset-0" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 18 }}
          className="relative mx-auto mb-5 w-fit"
        >
          <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#D9C89A] to-[#BFA05A] opacity-80 blur-[2px]" />
          <img
            src={parametres.photo_guide || PHOTO_GUIDE_PAR_DEFAUT}
            alt={parametres.nom_guide}
            className="relative h-40 w-40 rounded-full object-cover object-top ring-4 ring-[#0B3D2E] md:h-48 md:w-48"
          />
        </motion.div>
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-[#D9C89A]">{t("nav.biographie")}</p>
        <h1 className="relative mt-2 text-3xl font-bold md:text-4xl">{parametres.nom_guide}</h1>
        <p className="relative mx-auto mt-2 max-w-lg text-sm text-white/80">
          <Traduit texte={parametres.titre_guide || t("biographie.titreGuide")} />
        </p>
      </motion.section>

      <VideoGuide parametres={parametres} className="mx-auto mb-10 max-w-3xl" />

      {pageVide && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border-subtle px-6 py-10 text-center">
          <BookOpen className="h-8 w-8 text-accent-primary" />
          <p className="font-semibold text-text-primary">{t("biographie.bientot")}</p>
          <p className="text-sm text-text-secondary">{t("biographie.bientotAide")}</p>
        </div>
      )}

      <ListeAnimee className="relative mx-auto flex max-w-3xl flex-col gap-6">
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

      {medias.length > 0 && (
        <section className="mx-auto mt-10 max-w-3xl">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-text-primary">
            <Headphones className="h-5 w-5 text-accent-primary" /> {t("biographie.ecouterRegarder")}
          </h2>
          <ListeAnimee className="flex flex-col gap-3">
            {medias.map((c) => (
              <ElementAnime key={c.id} className="flex flex-col gap-2">
                <CarteContenu contenu={c} />
                {c.type === "audio" && c.fichier && (
                  <audio controls preload="none" src={c.fichier} className="h-10 w-full" />
                )}
              </ElementAnime>
            ))}
          </ListeAnimee>
        </section>
      )}
    </AppShell>
  );
}
