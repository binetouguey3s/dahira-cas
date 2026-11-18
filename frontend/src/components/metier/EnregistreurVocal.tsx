import { AnimatePresence, motion } from "motion/react";
import { Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";

const DUREE_MAX = 180; // secondes

export interface Vocal {
  blob: Blob;
  url: string;
  extension: string;
}

/** Choisit un format que le navigateur sait enregistrer (webm sur Android/Chrome, mp4 sur iPhone/Safari). */
function formatEnregistrement() {
  const formats = [
    ["audio/webm;codecs=opus", "webm"],
    ["audio/webm", "webm"],
    ["audio/mp4", "m4a"],
    ["audio/ogg;codecs=opus", "ogg"],
  ] as const;
  for (const [mime, extension] of formats) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return { mime, extension };
  }
  return { mime: "", extension: "webm" };
}

function minutes(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Enregistre un message vocal au micro, avec écoute avant envoi. */
export function EnregistreurVocal({ vocal, onChange }: { vocal: Vocal | null; onChange: (v: Vocal | null) => void }) {
  const { t } = useTranslation();
  const [enCours, setEnCours] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState("");
  const enregistreur = useRef<MediaRecorder | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const minuterie = useRef<number | null>(null);
  const disponible = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const arreterMinuterie = () => {
    if (minuterie.current !== null) window.clearInterval(minuterie.current);
    minuterie.current = null;
  };

  useEffect(
    () => () => {
      arreterMinuterie();
      enregistreur.current?.stream.getTracks().forEach((p) => p.stop());
    },
    [],
  );

  const arreter = () => {
    arreterMinuterie();
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
    setEnCours(false);
  };

  const demarrer = async () => {
    setErreur("");
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const { mime, extension } = formatEnregistrement();
      const rec = new MediaRecorder(flux, mime ? { mimeType: mime } : undefined);
      morceaux.current = [];
      rec.ondataavailable = (e) => e.data.size && morceaux.current.push(e.data);
      rec.onstop = () => {
        flux.getTracks().forEach((p) => p.stop());
        const blob = new Blob(morceaux.current, { type: rec.mimeType || mime || "audio/webm" });
        if (blob.size) onChange({ blob, url: URL.createObjectURL(blob), extension });
      };
      enregistreur.current = rec;
      rec.start(250);
      setSecondes(0);
      setEnCours(true);
      minuterie.current = window.setInterval(() => {
        setSecondes((s) => {
          if (s + 1 >= DUREE_MAX) arreter();
          return s + 1;
        });
      }, 1000);
    } catch {
      setErreur(t("vocal.micRefuse"));
    }
  };

  if (!disponible) return <p className="text-xs text-text-secondary">{t("vocal.nonDisponible")}</p>;

  return (
    <div className="rounded-2xl border border-border-subtle p-3">
      <AnimatePresence mode="wait" initial={false}>
        {vocal && !enCours ? (
          <motion.div key="ecoute" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
            <audio controls src={vocal.url} className="h-10 min-w-0 flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-status-error"
              aria-label={t("vocal.supprimer")}
              onClick={() => onChange(null)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : enCours ? (
          <motion.div key="enregistre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-error opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-status-error" />
            </span>
            <div className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
              {Array.from({ length: 28 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="w-[3px] shrink-0 rounded-full bg-accent-primary"
                  animate={{ height: ["20%", `${30 + ((i * 37) % 70)}%`, "20%"] }}
                  transition={{ duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">
              {minutes(secondes)} / {minutes(DUREE_MAX)}
            </span>
            <Button type="button" size="icon" variant="danger" className="shrink-0" aria-label={t("vocal.arreter")} onClick={arreter}>
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </motion.div>
        ) : (
          <motion.button
            key="demarrer"
            type="button"
            onClick={demarrer}
            whileTap={{ scale: 0.97 }}
            className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-start"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-primary text-white shadow-sm">
              <Mic className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-text-primary">{t("vocal.enregistrer")}</span>
              <span className="block text-xs text-text-secondary">{t("vocal.aide")}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      {erreur && <p className="mt-2 text-xs font-medium text-status-error">{erreur}</p>}
    </div>
  );
}

/** Ajoute le vocal à un formulaire d'envoi. */
export function ajouterVocal(donnees: FormData, vocal: Vocal | null) {
  if (vocal) donnees.append("audio", vocal.blob, `vocal.${vocal.extension}`);
}
