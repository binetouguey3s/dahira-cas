import { AnimatePresence, motion } from "motion/react";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Bandeau en haut de l'écran quand la connexion internet coupe (réseau mobile instable),
 * puis « Connexion rétablie » pendant 2,5 s quand elle revient.
 */
export function BandeauHorsLigne() {
  const { t } = useTranslation();
  const [enLigne, setEnLigne] = useState(() => navigator.onLine);
  const [retour, setRetour] = useState(false);

  useEffect(() => {
    let minuterie: number | undefined;
    const hors = () => {
      window.clearTimeout(minuterie);
      setRetour(false);
      setEnLigne(false);
    };
    const de = () => {
      setEnLigne(true);
      setRetour(true);
      minuterie = window.setTimeout(() => setRetour(false), 2500);
    };
    window.addEventListener("offline", hors);
    window.addEventListener("online", de);
    return () => {
      window.removeEventListener("offline", hors);
      window.removeEventListener("online", de);
      window.clearTimeout(minuterie);
    };
  }, []);

  const visible = !enLigne || retour;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={enLigne ? "retour" : "hors"}
          role="status"
          aria-live="polite"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[90] flex justify-center px-4"
        >
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${
              enLigne ? "bg-[#1E7A5D] text-white" : "bg-[#3a2a12] text-[#F3E7C4]"
            }`}
          >
            {enLigne ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {enLigne ? t("reseau.retabli") : t("reseau.horsLigne")}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
