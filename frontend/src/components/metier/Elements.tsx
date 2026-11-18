import { FileText, Headphones, Heart, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge, CardInteractive } from "@/components/ui/Card";
import { Traduit } from "@/context/TraductionContext";
import type { ContenuMedia, Evenement, TypeContenu } from "@/lib/api";
import { formatDate, locale } from "@/lib/utils";

export const ICONES_CONTENU: Record<TypeContenu, typeof Headphones> = {
  audio: Headphones,
  video: Video,
  texte: FileText,
};

/** Pavé date (jour + mois) des événements. */
export function PaveDate({ date, passe }: { date: string; passe?: boolean }) {
  const d = new Date(date);
  return (
    <div
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ${
        passe ? "bg-bg-secondary text-text-secondary" : "bg-gradient-to-br from-accent-primary to-[#0B3D2E] text-white"
      }`}
    >
      <span className="text-xl font-bold leading-none tabular-nums">{d.getDate()}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-85">
        {d.toLocaleDateString(locale(), { month: "short" }).replace(".", "")}
      </span>
    </div>
  );
}

export function CarteEvenement({ evenement }: { evenement: Evenement }) {
  const { t } = useTranslation();
  const passe = new Date(evenement.date) < new Date();
  return (
    <Link to={`/evenements/${evenement.id}`} className="block">
      <CardInteractive className="flex items-center gap-4">
        <PaveDate date={evenement.date} passe={passe} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone="or">{t(`evenements.categories.${evenement.categorie}`)}</Badge>
            {evenement.reservation_bus_active && !passe && <Badge tone="success">{t("evenements.busOuvert")}</Badge>}
          </div>
          <p className="truncate font-semibold text-text-primary">
            <Traduit texte={evenement.titre} />
          </p>
          <p className="truncate text-sm text-text-secondary">
            {new Date(evenement.date).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}
            {evenement.lieu && (
              <>
                {" · "}
                <Traduit texte={evenement.lieu} />
              </>
            )}
          </p>
        </div>
      </CardInteractive>
    </Link>
  );
}

export function CarteContenu({ contenu }: { contenu: ContenuMedia }) {
  const { t } = useTranslation();
  const Icone = ICONES_CONTENU[contenu.type] ?? FileText;
  return (
    <Link to={`/mediatheque/${contenu.id}`} className="block">
      <CardInteractive className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
          <Icone className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text-primary">
            <Traduit texte={contenu.titre} />
          </p>
          <p className="truncate text-sm text-text-secondary">
            {contenu.auteur} · {formatDate(contenu.date_publication, { day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone="neutral">{t(`mediatheque.types.${contenu.type}`)}</Badge>
          <span className="flex items-center gap-1 text-xs text-text-secondary">
            <Heart className={`h-3.5 w-3.5 ${contenu.aime ? "fill-status-error text-status-error" : ""}`} />
            {contenu.nb_likes}
          </span>
        </div>
      </CardInteractive>
    </Link>
  );
}
