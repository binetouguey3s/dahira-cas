import { AnimatePresence, motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Champ, MotDePasseInput } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur } from "@/lib/api";

/** Lien reçu par e-mail : /reinitialiser/:uid/:jeton — choix d'un nouveau mot de passe. */
export default function Reinitialiser() {
  const { t } = useTranslation();
  const { uid = "", jeton = "" } = useParams();
  const { connecter } = useAuth();
  const { notifier } = useToast();
  const navigate = useNavigate();
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [lienExpire, setLienExpire] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (nouveau !== confirmation) return setErreur(t("reinitialiser.differents"));
    setEnvoi(true);
    try {
      const { data } = await api.post<{ telephone: string }>("/comptes/mot-de-passe/reinitialiser/", { uid, jeton, nouveau });
      notifier(t("reinitialiser.succes"));
      // Connexion directe avec le nouveau mot de passe.
      try {
        await connecter(data.telephone, nouveau);
        navigate("/", { replace: true });
      } catch {
        navigate("/connexion", { replace: true });
      }
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string; nouveau?: string[] } } }).response?.data;
      if (detail?.nouveau) setErreur(detail.nouveau.join(" "));
      else {
        setLienExpire(true);
        setErreur(messageErreur(err, t("reinitialiser.lienExpire")));
      }
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AuthLayout titre={t("reinitialiser.titre")} sousTitre={t("reinitialiser.sousTitre")}>
      <form onSubmit={soumettre} className="flex flex-col gap-4">
        <Champ label={t("reinitialiser.nouveau")} aide={t("inscription.aideMotDePasse")}>
          {(id) => (
            <MotDePasseInput
              id={id}
              autoComplete="new-password"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              minLength={8}
              libelleAfficher={t("champs.afficherMotDePasse")}
              required
              autoFocus
            />
          )}
        </Champ>
        <Champ label={t("reinitialiser.confirmation")}>
          {(id) => (
            <MotDePasseInput
              id={id}
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              libelleAfficher={t("champs.afficherMotDePasse")}
              required
            />
          )}
        </Champ>

        <AnimatePresence>
          {erreur && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 rounded-xl bg-status-error-bg px-3 py-2.5 text-sm text-status-error"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {erreur}{" "}
                {lienExpire && (
                  <Link to="/connexion?oublie=1" className="font-semibold underline">
                    {t("reinitialiser.redemander")}
                  </Link>
                )}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" chargement={envoi} size="lg" className="w-full">
          {t("reinitialiser.bouton")}
        </Button>
        <Link to="/connexion" className="text-center text-xs font-semibold text-text-secondary hover:text-text-primary">
          {t("reinitialiser.retour")}
        </Link>
      </form>
    </AuthLayout>
  );
}
