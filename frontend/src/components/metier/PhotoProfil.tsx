import { AnimatePresence, motion } from "motion/react";
import { Camera, ImageUp, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Divers";
import { Modal } from "@/components/ui/Modal";

const TAILLE_SORTIE = 720;

/** Recadre une image en carré (en gardant le haut pour les portraits) et la compresse en JPEG. */
async function preparerPhoto(source: CanvasImageSource, largeur: number, hauteur: number, miroir = false): Promise<Blob> {
  const cote = Math.min(largeur, hauteur);
  const x = (largeur - cote) / 2;
  // Pour une photo en hauteur, on garde le visage : recadrage vers le haut.
  const y = hauteur > largeur ? (hauteur - cote) * 0.2 : (hauteur - cote) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = TAILLE_SORTIE;
  canvas.height = TAILLE_SORTIE;
  const ctx = canvas.getContext("2d")!;
  if (miroir) {
    ctx.translate(TAILLE_SORTIE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, x, y, cote, cote, 0, 0, TAILLE_SORTIE, TAILLE_SORTIE);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("photo"))), "image/jpeg", 0.88),
  );
}

async function fichierVersBlob(fichier: File): Promise<Blob> {
  const bitmap = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  try {
    return await preparerPhoto(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

function ModalSelfie({ ouvert, onFermer, onPhoto }: { ouvert: boolean; onFermer: () => void; onPhoto: (b: Blob) => void }) {
  const { t } = useTranslation();
  const video = useRef<HTMLVideoElement>(null);
  const flux = useRef<MediaStream | null>(null);
  const [erreur, setErreur] = useState("");
  const [apercu, setApercu] = useState<{ blob: Blob; url: string } | null>(null);
  const [flash, setFlash] = useState(false);

  const arreter = () => {
    flux.current?.getTracks().forEach((p) => p.stop());
    flux.current = null;
  };

  const demarrer = async () => {
    setErreur("");
    try {
      const f = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      flux.current = f;
      if (video.current) {
        video.current.srcObject = f;
        await video.current.play();
      }
    } catch {
      setErreur(t("photo.cameraRefusee"));
    }
  };

  useEffect(() => {
    if (ouvert && !apercu) demarrer();
    if (!ouvert) {
      arreter();
      setApercu(null);
    }
    return arreter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, apercu]);

  const capturer = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);
    const blob = await preparerPhoto(v, v.videoWidth, v.videoHeight, true);
    arreter();
    setApercu({ blob, url: URL.createObjectURL(blob) });
  };

  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      titre={t("photo.selfie")}
      description={t("photo.selfieAide")}
      pied={
        apercu ? (
          <>
            <Button variant="outline" onClick={() => setApercu(null)}>
              <RefreshCw className="h-4 w-4" /> {t("photo.reprendre")}
            </Button>
            <Button onClick={() => onPhoto(apercu.blob)}>{t("photo.utiliser")}</Button>
          </>
        ) : (
          <Button onClick={capturer} disabled={!!erreur} size="lg" className="w-full sm:w-auto">
            <Camera className="h-5 w-5" /> {t("photo.prendre")}
          </Button>
        )
      }
    >
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[28px] bg-black">
        {apercu ? (
          <motion.img initial={{ scale: 1.05 }} animate={{ scale: 1 }} src={apercu.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        )}
        {/* Guide de cadrage du visage */}
        {!apercu && !erreur && (
          <div className="pointer-events-none absolute inset-[14%] rounded-full border-2 border-dashed border-white/60" />
        )}
        <AnimatePresence>
          {flash && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} exit={{ opacity: 0 }} />}
        </AnimatePresence>
        {erreur && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">{erreur}</div>
        )}
      </div>
    </Modal>
  );
}

/** Photo de profil : import depuis l'appareil, selfie (caméra) ou suppression. */
export function PhotoProfil({
  nom,
  photo,
  onEnvoyer,
  onSupprimer,
  taille = 112,
}: {
  nom: string;
  photo: string | null;
  onEnvoyer: (b: Blob) => Promise<void>;
  onSupprimer?: () => Promise<void>;
  taille?: number;
}) {
  const { t } = useTranslation();
  const fichier = useRef<HTMLInputElement>(null);
  const appareil = useRef<HTMLInputElement>(null);
  const [selfie, setSelfie] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const cameraWeb = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const envoyer = async (blob: Blob) => {
    setEnvoi(true);
    try {
      await onEnvoyer(blob);
      setSelfie(false);
    } finally {
      setEnvoi(false);
    }
  };

  const surFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) await envoyer(await fichierVersBlob(f));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <motion.div key={photo ?? "vide"} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Avatar nom={nom} photo={photo} taille={taille} className="ring-4 ring-accent-soft" />
        </motion.div>
        {envoi && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <RefreshCw className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        <button
          onClick={() => (cameraWeb ? setSelfie(true) : appareil.current?.click())}
          aria-label={t("photo.selfie")}
          className="absolute -bottom-1 -end-1 flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary text-white shadow-lg ring-4 ring-bg-elevated transition hover:scale-105"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => fichier.current?.click()} disabled={envoi}>
          <ImageUp className="h-4 w-4" /> {t("photo.importer")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => (cameraWeb ? setSelfie(true) : appareil.current?.click())} disabled={envoi}>
          <Camera className="h-4 w-4" /> {t("photo.selfie")}
        </Button>
        {photo && onSupprimer && (
          <Button variant="ghost" size="sm" className="text-status-error" onClick={onSupprimer} disabled={envoi}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input ref={fichier} type="file" accept="image/*" className="hidden" onChange={surFichier} />
      {/* Sur mobile sans accès caméra web : ouvre directement l'appareil photo frontal */}
      <input ref={appareil} type="file" accept="image/*" capture="user" className="hidden" onChange={surFichier} />
      <ModalSelfie ouvert={selfie} onFermer={() => setSelfie(false)} onPhoto={envoyer} />
    </div>
  );
}
