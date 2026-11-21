import QRCode from "qrcode";
import { forwardRef, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/layout/Logo";
import { useParametres } from "@/context/ParametresContext";
import type { Membre } from "@/lib/api";
import { nomPays } from "@/lib/pays";
import { initiales } from "@/lib/utils";

/**
 * Carte de membre au format carte bancaire (ISO/CEI 7810 ID-1 : 85,6 × 54 mm).
 * Toutes les tailles sont exprimées en « cqw » (pourcentage de la largeur de la carte) :
 * la carte garde exactement les mêmes proportions à l'écran, à l'impression et en image.
 */

export function urlVerification(numero: string) {
  return `${window.location.origin}/verifier/${encodeURIComponent(numero)}`;
}

const FOND =
  "bg-[radial-gradient(120%_140%_at_100%_0%,#1E7A5D_0%,#0f4d39_45%,#082019_100%)]";

function Motif() {
  const id = `motif-carte-${useId().replace(/:/g, "")}`;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.09]" aria-hidden>
      <defs>
        <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#D9C89A" strokeWidth="0.8">
            <rect x="7" y="7" width="14" height="14" />
            <rect x="7" y="7" width="14" height="14" transform="rotate(45 14 14)" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[2.1cqw] font-semibold uppercase tracking-[0.12em] text-[#D9C89A]/85">{label}</p>
      <p className="line-clamp-2 text-[3.2cqw] font-semibold leading-[1.1] text-white [overflow-wrap:anywhere]">{valeur}</p>
    </div>
  );
}

export const RectoCarte = forwardRef<HTMLDivElement, { membre: Membre }>(({ membre }, ref) => {
  const { t } = useTranslation();
  const [photoEchec, setPhotoEchec] = useState(false);
  const { parametres } = useParametres();
  return (
    <div ref={ref} className="@container w-full">
      <div
        className={`relative aspect-[85.6/54] w-full overflow-hidden rounded-[4.2cqw] ${FOND} text-white shadow-[0_30px_60px_-20px_rgba(8,32,25,0.65)]`}
        dir="ltr"
      >
        <Motif />
        {/* Halo doré */}
        <div className="pointer-events-none absolute -right-[12cqw] -top-[18cqw] h-[48cqw] w-[48cqw] rounded-full bg-[#D9C89A]/20 blur-[6cqw]" />
        {/* Bande dorée basse */}
        <div className="absolute inset-x-0 bottom-0 h-[1.4cqw] bg-gradient-to-r from-[#BFA05A] via-[#F3E7C4] to-[#BFA05A]" />

        {/* En-tête */}
        <div className="absolute inset-x-[5cqw] top-[4.2cqw] flex items-center gap-[2.4cqw]">
          <Logo taille={0} className="!h-[9cqw] !w-[9cqw]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[3.3cqw] font-bold leading-tight">{parametres.nom_dahira}</p>
            <p className="text-[2.2cqw] font-semibold uppercase tracking-[0.28em] text-[#D9C89A]">{t("carte.carteDeMembre")}</p>
          </div>
          <p className="rounded-[1.2cqw] border border-[#D9C89A]/50 px-[1.6cqw] py-[0.6cqw] text-[2.2cqw] font-bold tracking-[0.18em] text-[#F3E7C4]">
            {parametres.sigle}
          </p>
        </div>

        {/* Corps */}
        <div className="absolute inset-x-[5cqw] bottom-[6cqw] top-[18.5cqw] flex gap-[4cqw]">
          <div className="relative h-full shrink-0">
            <div className="h-full aspect-[3/3.7] overflow-hidden rounded-[2.4cqw] border-[0.5cqw] border-[#D9C89A] bg-[#0B3D2E]">
              {membre.photo && !photoEchec ? (
                <img src={membre.photo} alt="" crossOrigin="anonymous" onError={() => setPhotoEchec(true)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[8cqw] font-bold text-[#D9C89A]">
                  {initiales(membre.nom_complet)}
                </div>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between py-[0.4cqw]">
            <div className="min-w-0">
              <p className="text-[2.1cqw] font-semibold uppercase tracking-[0.12em] text-[#D9C89A]/85">{t("carte.nom")}</p>
              <p className="line-clamp-2 text-[4.6cqw] font-bold uppercase leading-[1.08] tracking-wide">{membre.nom_complet}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-[3cqw]">
              <Ligne label={t("carte.numero")} valeur={membre.carte_numero} />
              <Ligne label={t("carte.qualite")} valeur={t(`roles.${membre.role}`)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
RectoCarte.displayName = "RectoCarte";

export const VersoCarte = forwardRef<HTMLDivElement, { membre: Membre }>(({ membre }, ref) => {
  const { t, i18n } = useTranslation();
  const { parametres } = useParametres();
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(urlVerification(membre.carte_numero), {
      margin: 1,
      width: 480,
      errorCorrectionLevel: "M",
      color: { dark: "#082019", light: "#ffffff" },
    }).then(setQr);
  }, [membre.carte_numero]);

  return (
    <div ref={ref} className="@container w-full">
      <div
        className="relative aspect-[85.6/54] w-full overflow-hidden rounded-[4.2cqw] bg-[#FBF8EF] text-[#0B3D2E] shadow-[0_30px_60px_-20px_rgba(8,32,25,0.45)]"
        dir="ltr"
      >
        <div className={`absolute inset-x-0 top-0 h-[11cqw] ${FOND}`}>
          <Motif />
          <div className="absolute inset-x-[5cqw] top-1/2 flex -translate-y-1/2 items-center justify-between">
            <p className="text-[2.6cqw] font-bold uppercase tracking-[0.22em] text-[#F3E7C4]">{parametres.nom_dahira}</p>
            <p className="text-[2.4cqw] font-semibold tracking-[0.14em] text-[#D9C89A]">{membre.carte_numero}</p>
          </div>
        </div>
        <div className="absolute inset-x-0 top-[11cqw] h-[0.9cqw] bg-gradient-to-r from-[#BFA05A] via-[#F3E7C4] to-[#BFA05A]" />

        <div className="absolute inset-x-[5cqw] bottom-[4.5cqw] top-[16cqw] flex gap-[4.5cqw]">
          <div className="flex shrink-0 flex-col items-center gap-[1cqw]">
            <div className="rounded-[2cqw] border border-[#0B3D2E]/10 bg-white p-[1cqw]">
              {qr && <img src={qr} alt="QR" className="h-[23cqw] w-[23cqw]" />}
            </div>
            <p className="text-[1.9cqw] font-semibold uppercase tracking-[0.1em] text-[#0B3D2E]/70">{t("carte.scannerVerifier")}</p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="space-y-[1.4cqw]">
              {membre.telephone && (
                <div>
                  <p className="text-[2cqw] font-semibold uppercase tracking-[0.12em] text-[#8a6d2a]">{t("carte.telephone")}</p>
                  <p className="text-[3cqw] font-semibold">{membre.telephone}</p>
                </div>
              )}
              {membre.adresse && (
                <div>
                  <p className="text-[2cqw] font-semibold uppercase tracking-[0.12em] text-[#8a6d2a]">{t("carte.adresse")}</p>
                  <p className="line-clamp-2 text-[3cqw] font-semibold leading-tight">
                    {[membre.adresse, nomPays(membre.pays, i18n.language)].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
            </div>
            <div>
              <p className="text-[1.9cqw] leading-snug text-[#0B3D2E]/70">{t("carte.mention")}</p>
              {(parametres.telephone_contact || parametres.email_contact) && (
                <p className="mt-[0.6cqw] truncate text-[1.9cqw] font-semibold text-[#0B3D2E]/80">
                  {[parametres.telephone_contact, parametres.email_contact].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
VersoCarte.displayName = "VersoCarte";
