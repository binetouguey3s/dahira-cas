import { AnimatePresence, motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Champ, MotDePasseInput } from "@/components/ui/Input";
import { TelephoneInput } from "@/components/ui/TelephoneInput";
import { MotDePasseOublie } from "@/components/metier/MotDePasseOublie";
import { useAuth } from "@/context/AuthContext";

export default function Connexion() {
  const { t } = useTranslation();
  const { connecter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const depuis = (location.state as { depuis?: string } | null)?.depuis ?? "/";

  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  // « /connexion?oublie=1 » ouvre directement la fenêtre (lien expiré, par exemple).
  const [aideOuverte, setAideOuverte] = useState(() => new URLSearchParams(location.search).get("oublie") === "1");

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      await connecter(telephone, motDePasse);
      navigate(depuis, { replace: true });
    } catch (err) {
      const statut = (err as { response?: { status?: number } }).response?.status;
      setErreur(t(statut === 429 ? "connexion.tropDeTentatives" : "connexion.erreur"));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AuthLayout titre={t("connexion.titre")} sousTitre={t("connexion.sousTitre")}>
      <form onSubmit={soumettre} className="flex flex-col gap-4">
        <Champ label={t("champs.telephone")}>
          {(id) => (
            <TelephoneInput id={id} valeur={telephone} onChange={setTelephone} libre required />
          )}
        </Champ>
        <Champ label={t("champs.motDePasse")}>
          {(id) => (
            <MotDePasseInput
              id={id}
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              libelleAfficher={t("champs.afficherMotDePasse")}
              required
            />
          )}
        </Champ>

        <button
          type="button"
          onClick={() => setAideOuverte(true)}
          className="-mt-1 self-end text-xs font-semibold text-accent-primary hover:underline"
        >
          {t("connexion.oublie")}
        </button>

        <AnimatePresence>
          {erreur && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-xl bg-status-error-bg px-3 py-2.5 text-sm text-status-error"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0" /> {erreur}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" chargement={envoi} size="lg" className="w-full">
          {t("connexion.bouton")}
        </Button>

        <p className="text-center text-sm text-text-secondary">
          {t("connexion.pasDeCompte")}{" "}
          <Link to="/inscription" className="font-semibold text-accent-primary hover:underline">
            {t("connexion.sInscrire")}
          </Link>
        </p>
        <Link to="/" className="text-center text-xs font-semibold text-text-secondary hover:text-text-primary">
          {t("connexion.continuerSansCompte")}
        </Link>
      </form>

      <Modal ouvert={aideOuverte} onFermer={() => setAideOuverte(false)} titre={t("connexion.oublieTitre")}>
        <MotDePasseOublie identifiantInitial={/[a-z@]/i.test(telephone) ? "" : telephone} />
      </Modal>
    </AuthLayout>
  );
}
