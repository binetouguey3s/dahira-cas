import { AnimatePresence, motion } from "motion/react";
import { Download, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CLE_MASQUE = "dahira_installation_masquee";
const DUREE_MASQUE = 30 * 24 * 3600 * 1000; // la carte de l'accueil revient après 30 jours

function invitationGardee() {
  return (window as unknown as { __invitationInstallation?: InvitationInstallation }).__invitationInstallation ?? null;
}

function dejaInstallee() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function surIphone() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/** État de l'installation : possible (Android/Chrome), guidée (iPhone) ou déjà faite. */
export function useInstallation() {
  const [invitation, setInvitation] = useState<InvitationInstallation | null>(() => invitationGardee());
  const [installee, setInstallee] = useState(() => dejaInstallee());

  useEffect(() => {
    const dispo = () => setInvitation(invitationGardee());
    const faite = () => {
      setInstallee(true);
      setInvitation(null);
    };
    window.addEventListener("installation-disponible", dispo);
    window.addEventListener("appinstalled", faite);
    return () => {
      window.removeEventListener("installation-disponible", dispo);
      window.removeEventListener("appinstalled", faite);
    };
  }, []);

  const iphone = surIphone();
  return {
    possible: !installee && (!!invitation || iphone),
    iphone,
    installer: async (): Promise<"faite" | "guide" | "annulee"> => {
      if (invitation) {
        await invitation.prompt();
        const { outcome } = await invitation.userChoice;
        setInvitation(null);
        return outcome === "accepted" ? "faite" : "annulee";
      }
      return "guide";
    },
  };
}

/** Les 3 gestes à faire sur iPhone (Apple ne permet pas l'installation en un bouton). */
export function GuideIphone({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const { t } = useTranslation();
  const etapes = [
    { icone: Share, texte: t("installation.iphone1") },
    { icone: PlusSquare, texte: t("installation.iphone2") },
    { icone: Smartphone, texte: t("installation.iphone3") },
  ];
  return (
    <Modal ouvert={ouvert} onFermer={onFermer} titre={t("installation.titre")} description={t("installation.iphoneIntro")}>
      <ol className="flex flex-col gap-3">
        {etapes.map(({ icone: Icone, texte }, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl bg-bg-secondary p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-text-inverse">
              <Icone className="h-5 w-5" />
            </span>
            <span className="text-sm text-text-primary">
              <strong>{i + 1}.</strong> {texte}
            </span>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

/** Bouton « Installer l'application » (menu Plus, profil…). N'apparaît que si l'installation est possible. */
export function BoutonInstaller({ className, onFait }: { className?: string; onFait?: () => void }) {
  const { t } = useTranslation();
  const { possible, installer } = useInstallation();
  const [guide, setGuide] = useState(false);
  if (!possible) return null;
  return (
    <>
      <Button
        variant="secondary"
        className={className}
        onClick={async () => {
          const resultat = await installer();
          if (resultat === "guide") setGuide(true);
          else onFait?.();
        }}
      >
        <Download className="h-4 w-4" /> {t("installation.bouton")}
      </Button>
      <GuideIphone ouvert={guide} onFermer={() => setGuide(false)} />
    </>
  );
}

/** Carte de l'accueil invitant à installer l'application (masquable 30 jours). */
export function CarteInstallation() {
  const { t } = useTranslation();
  const { possible, installer } = useInstallation();
  const [guide, setGuide] = useState(false);
  const [masquee, setMasquee] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem(CLE_MASQUE) ?? 0) < DUREE_MASQUE;
    } catch {
      return false;
    }
  });

  const masquer = () => {
    setMasquee(true);
    try {
      localStorage.setItem(CLE_MASQUE, String(Date.now()));
    } catch {
      /* stockage indisponible */
    }
  };

  return (
    <>
      <AnimatePresence>
        {possible && !masquee && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="relative mb-8 flex items-center gap-4 overflow-hidden rounded-[22px] border border-accent-secondary/40 bg-gradient-to-br from-accent-secondary/15 to-bg-elevated p-4"
          >
            <img src="/icone-192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl shadow-md" />
            <div className="min-w-0 flex-1 pe-8">
              <p className="font-bold text-text-primary">{t("installation.carteTitre")}</p>
              <p className="text-xs text-text-secondary">{t("installation.carteTexte")}</p>
              <Button
                size="sm"
                className="mt-2"
                onClick={async () => {
                  const resultat = await installer();
                  if (resultat === "guide") setGuide(true);
                }}
              >
                <Download className="h-4 w-4" /> {t("installation.bouton")}
              </Button>
            </div>
            <button
              type="button"
              onClick={masquer}
              aria-label={t("installation.plusTard")}
              className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <GuideIphone ouvert={guide} onFermer={() => setGuide(false)} />
    </>
  );
}
