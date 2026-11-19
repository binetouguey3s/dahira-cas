import { motion } from "motion/react";
import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Traduit } from "@/context/TraductionContext";
import type { Parametres } from "@/lib/api";
import { lienIntegrable } from "@/lib/utils";

export function aUneVideoGuide(p: Parametres) {
  return !!(p.video_guide || /^https?:\/\//i.test(p.video_guide_lien));
}

/**
 * Vidéo de présentation du Guide : fichier envoyé par l'admin, ou lien (YouTube / Vimeo intégrés,
 * autres sites — TikTok, Facebook… — ouverts dans un nouvel onglet).
 */
export function VideoGuide({ parametres, className }: { parametres: Parametres; className?: string }) {
  const { t } = useTranslation();
  const [lecture, setLecture] = useState(false);
  if (!aUneVideoGuide(parametres)) return null;

  const integrable = parametres.video_guide ? null : lienIntegrable(parametres.video_guide_lien);
  const titre = parametres.video_guide_titre;
  const idYoutube = integrable?.match(/youtube\.com\/embed\/([\w-]{6,})/)?.[1];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <h2 className="mb-3 text-lg font-bold text-text-primary">{titre ? <Traduit texte={titre} /> : t("videoGuide.titre")}</h2>
      {parametres.video_guide ? (
        <video
          controls
          playsInline
          preload="metadata"
          src={parametres.video_guide}
          className="aspect-video w-full rounded-[var(--radius-lg)] bg-black shadow-xl"
        />
      ) : integrable ? (
        <div className="relative aspect-video overflow-hidden rounded-[var(--radius-lg)] bg-black shadow-xl">
          {lecture ? (
            <iframe
              className="h-full w-full"
              src={`${integrable}${integrable.includes("?") ? "&" : "?"}autoplay=1`}
              title={titre || t("videoGuide.titre")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            // Le lecteur externe n'est chargé qu'au clic : la page reste rapide sur mobile.
            <button
              type="button"
              onClick={() => setLecture(true)}
              aria-label={t("videoGuide.lire")}
              className="group absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0B3D2E] to-[#1E7A5D]"
            >
              {idYoutube ? (
                <img
                  src={`https://i.ytimg.com/vi/${idYoutube}/hqdefault.jpg`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                />
              ) : (
                <div className="motif-etoiles pointer-events-none absolute inset-0" />
              )}
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-accent-primary shadow-2xl transition-transform duration-300 group-hover:scale-110">
                <Play className="ms-1 h-7 w-7 fill-current" />
              </span>
            </button>
          )}
        </div>
      ) : (
        <a
          href={parametres.video_guide_lien}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-[var(--radius-lg)] bg-gradient-to-br from-[#0B3D2E] to-[#1E7A5D] p-5 text-white shadow-xl"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/95 text-accent-primary transition-transform duration-300 group-hover:scale-110">
            <Play className="ms-1 h-6 w-6 fill-current" />
          </span>
          <span className="flex-1 font-semibold">{t("videoGuide.regarder")}</span>
          <ExternalLink className="h-5 w-5 opacity-70" />
        </a>
      )}
    </motion.section>
  );
}
