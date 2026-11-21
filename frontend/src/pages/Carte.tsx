import { toPng } from "html-to-image";

/**
 * Transforme une face de la carte en image PNG.
 * Sur iPhone (Safari) et certains Android, les images (QR code, photo) ne sont pas encore « peintes »
 * au premier passage : elles sortaient en carré blanc. On attend qu'elles soient prêtes, puis on fait
 * plusieurs passages et on garde le dernier, qui est complet.
 */
async function capturer(noeud: HTMLElement) {
  await Promise.all(
    Array.from(noeud.querySelectorAll("img")).map((img) =>
      img.complete && img.naturalWidth ? img.decode?.().catch(() => undefined) : new Promise((r) => {
        img.addEventListener("load", r, { once: true });
        img.addEventListener("error", r, { once: true });
      }),
    ),
  );
  const options = { pixelRatio: 3, cacheBust: true, skipFonts: false };
  let url = "";
  for (let passage = 0; passage < 3; passage++) url = await toPng(noeud, options);
  return url;
}

/** Image « data:image/png;base64,… » → fichier, sans passer par fetch (bloqué par la sécurité du site). */
function versFichier(dataUrl: string, nom: string) {
  const binaire = atob(dataUrl.split(",")[1]);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new File([octets], nom, { type: "image/png" });
}

function telechargerFichiers(fichiers: File[]) {
  return fichiers.reduce(
    (attente, fichier) =>
      attente.then(async () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(fichier);
        a.download = fichier.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 500)); // iPhone bloque deux téléchargements trop rapprochés
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      }),
    Promise.resolve(),
  );
}
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Circle, Download, Printer, RotateCw, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { RectoCarte, VersoCarte, urlVerification } from "@/components/metier/CarteMembre";
import { FormulaireProfil } from "@/components/metier/FormulaireProfil";
import { PhotoProfil } from "@/components/metier/PhotoProfil";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EnTete } from "@/components/ui/Divers";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { messageErreur } from "@/lib/api";
import { CHAMPS_CARTE, champsManquants } from "@/lib/carte";

const LIBELLES: Record<string, string> = {
  photo: "photo.photo",
  nom_complet: "champs.nomComplet",
};

/** Étape 1 : compléter les informations indispensables à la carte. */
function AssistantCarte() {
  const { t } = useTranslation();
  const { membre, mettreAJour } = useAuth();
  const { notifier } = useToast();
  if (!membre) return null;
  const manquants = champsManquants(membre);
  const champsFormulaire = manquants.filter((c) => c !== "photo");

  const envoyerPhoto = async (blob: Blob) => {
    const donnees = new FormData();
    donnees.append("photo", blob, "photo.jpg");
    try {
      await mettreAJour(donnees);
      notifier(t("photo.enregistree"));
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit p-5">
        <p className="mb-3 text-sm font-bold text-text-primary">{t("carte.informationsRequises")}</p>
        <ul className="flex flex-col gap-2.5">
          {CHAMPS_CARTE.map((c) => {
            const ok = !manquants.includes(c);
            return (
              <li key={c} className={`flex items-center gap-2.5 text-sm ${ok ? "text-text-secondary" : "font-semibold text-text-primary"}`}>
                <motion.span key={String(ok)} initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                  {ok ? <CheckCircle2 className="h-5 w-5 text-status-success" /> : <Circle className="h-5 w-5 text-border-default" />}
                </motion.span>
                {t(LIBELLES[c])}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex flex-col gap-5">
        {manquants.includes("photo") && (
          <Card className="p-6">
            <h2 className="mb-1 font-bold text-text-primary">{t("carte.etapePhoto")}</h2>
            <p className="mb-5 text-sm text-text-secondary">{t("carte.etapePhotoAide")}</p>
            <PhotoProfil nom={membre.nom_complet} photo={membre.photo} onEnvoyer={envoyerPhoto} />
          </Card>
        )}
        {champsFormulaire.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-1 font-bold text-text-primary">{t("carte.etapeInfos")}</h2>
            <p className="mb-5 text-sm text-text-secondary">{t("carte.etapeInfosAide")}</p>
            <FormulaireProfil
              key={champsFormulaire.join(",")}
              seulement={champsFormulaire}
              libelleBouton={t("carte.continuer")}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Carte() {
  const { t } = useTranslation();
  const { membre } = useAuth();
  const { notifier } = useToast();
  const [retournee, setRetournee] = useState(false);
  const [export_, setExport] = useState(false);
  const [pretes, setPretes] = useState<File[] | null>(null);
  const recto = useRef<HTMLDivElement>(null);
  const verso = useRef<HTMLDivElement>(null);
  const rectoExport = useRef<HTMLDivElement>(null);
  const versoExport = useRef<HTMLDivElement>(null);

  if (!membre) return null;
  const complete = champsManquants(membre).length === 0;

  /** Enregistre les images prêtes : menu de partage sur téléphone (Photos / Galerie), sinon téléchargement. */
  const enregistrer = async (fichiers: File[]) => {
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    if (mobile && navigator.canShare?.({ files: fichiers })) {
      try {
        await navigator.share({ files: fichiers, title: t("carte.maCarte") });
        setPretes(null);
        notifier(t("carte.telechargee"));
        return;
      } catch (err) {
        const nom = (err as Error).name;
        if (nom === "AbortError") return; // menu fermé par le membre
        // iPhone : la préparation a pris quelques secondes, il faut un nouveau toucher pour ouvrir le menu.
        if (nom === "NotAllowedError") {
          setPretes(fichiers);
          return;
        }
      }
    }
    await telechargerFichiers(fichiers);
    setPretes(null);
    notifier(t("carte.telechargee"));
  };

  const telecharger = async () => {
    setExport(true);
    try {
      const fichiers: File[] = [];
      for (const [noeud, cote] of [
        [rectoExport.current, "recto"],
        [versoExport.current, "verso"],
      ] as const) {
        if (!noeud) continue;
        fichiers.push(versFichier(await capturer(noeud), `carte-${membre.carte_numero}-${cote}.png`));
      }
      await enregistrer(fichiers);
    } catch {
      notifier(t("carte.erreurTelechargement"), "erreur");
    } finally {
      setExport(false);
    }
  };

  return (
    <AppShell>
      <EnTete
        surTitre={t("nav.monEspace")}
        titre={t("carte.maCarte")}
        sousTitre={complete ? t("carte.sousTitre") : t("carte.sousTitreIncomplet")}
      />

      <AnimatePresence mode="wait">
        {!complete ? (
          <motion.div key="assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}>
            <AssistantCarte />
          </motion.div>
        ) : (
          <motion.div
            key="carte"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 print:hidden"
          >
            {/* Carte retournable */}
            <div className="w-full max-w-[520px] [perspective:1600px]">
              <motion.div
                className="relative cursor-pointer [transform-style:preserve-3d]"
                animate={{ rotateY: retournee ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                onClick={() => setRetournee((r) => !r)}
                whileHover={{ scale: 1.015 }}
                role="button"
                aria-label={t("carte.retourner")}
              >
                <div className="[backface-visibility:hidden]">
                  <RectoCarte ref={recto} membre={membre} />
                </div>
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <VersoCarte ref={verso} membre={membre} />
                </div>
              </motion.div>
            </div>

            <button
              onClick={() => setRetournee((r) => !r)}
              className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary"
            >
              <RotateCw className="h-4 w-4" /> {retournee ? t("carte.voirRecto") : t("carte.voirVerso")}
            </button>

            <div className="grid w-full max-w-[520px] grid-cols-2 gap-3">
              <Button size="lg" onClick={() => window.print()}>
                <Printer className="h-5 w-5" /> {t("carte.imprimer")}
              </Button>
              <Button size="lg" variant="outline" onClick={telecharger} chargement={export_}>
                <Download className="h-5 w-5" /> {t("carte.telecharger")}
              </Button>
            </div>

            {/* iPhone : images prêtes, un dernier toucher ouvre le menu « Enregistrer ». */}
            <AnimatePresence>
              {pretes && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex w-full max-w-[520px] flex-col items-center gap-3 rounded-2xl bg-accent-soft p-4 text-center"
                >
                  <p className="text-sm font-semibold text-text-primary">{t("carte.pretePourEnregistrer")}</p>
                  <Button size="lg" className="w-full" onClick={() => enregistrer(pretes)}>
                    <Download className="h-5 w-5" /> {t("carte.enregistrerPhotos")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="flex w-full max-w-[520px] items-start gap-3 bg-bg-secondary/50 p-4 text-sm text-text-secondary">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-primary" />
              <span>
                {t("carte.aideImpression")}{" "}
                <a href={urlVerification(membre.carte_numero)} target="_blank" rel="noreferrer" className="font-semibold text-accent-primary underline">
                  {t("carte.testerQr")}
                </a>
              </span>
            </Card>

            {/* Versions plates (sans rotation 3D) utilisées pour l'export en image */}
            <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0 flex w-[856px] flex-col gap-8">
              <RectoCarte ref={rectoExport} membre={membre} />
              <VersoCarte ref={versoExport} membre={membre} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Planche d'impression : taille réelle 85,6 × 54 mm, recto et verso avec traits de coupe */}
      {complete &&
        createPortal(
        <div className="zone-impression hidden print:block">
          <p className="mb-[6mm] text-center text-[9pt] text-gray-600">
            {t("carte.consigneImpression")}
          </p>
          <div className="flex flex-wrap justify-center gap-[10mm]">
            {[<RectoCarte key="r" membre={membre} />, <VersoCarte key="v" membre={membre} />].map((c, i) => (
              <div key={i} className="carte-taille-reelle relative">
                <span className="trait-coupe trait-coupe-hg" />
                <span className="trait-coupe trait-coupe-hd" />
                <span className="trait-coupe trait-coupe-bg" />
                <span className="trait-coupe trait-coupe-bd" />
                {c}
              </div>
            ))}
          </div>
        </div>,
          document.body,
        )}
    </AppShell>
  );
}
