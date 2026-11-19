import { AnimatePresence, motion } from "motion/react";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Champ, Input } from "@/components/ui/Input";
import { useParametres } from "@/context/ParametresContext";
import { api, messageErreur } from "@/lib/api";

/** Contenu de la fenêtre « Mot de passe oublié » : lien par e-mail, ou contact de l'administration. */
export function MotDePasseOublie({ identifiantInitial = "" }: { identifiantInitial?: string }) {
  const { t } = useTranslation();
  const { parametres } = useParametres();
  const [identifiant, setIdentifiant] = useState(identifiantInitial);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");

  const demander = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");
    try {
      await api.post("/comptes/mot-de-passe/oublie/", { identifiant: identifiant.trim() });
      setEnvoye(true);
    } catch (err) {
      const statut = (err as { response?: { status?: number } }).response?.status;
      setErreur(statut === 429 ? t("oublie.tropDeDemandes") : messageErreur(err, t("commun.erreur")));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <AnimatePresence mode="wait">
        {envoye ? (
          <motion.div
            key="envoye"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 rounded-2xl bg-accent-soft p-5 text-center"
            role="status"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary text-white">
              <MailCheck className="h-6 w-6" />
            </span>
            <p className="font-semibold text-text-primary">{t("oublie.envoyeTitre")}</p>
            <p className="text-sm leading-relaxed text-text-secondary">{t("oublie.envoyeMessage")}</p>
          </motion.div>
        ) : (
          <motion.form key="formulaire" onSubmit={demander} className="flex flex-col gap-4" exit={{ opacity: 0 }}>
            <p className="text-sm leading-relaxed text-text-secondary">{t("oublie.intro")}</p>
            <Champ label={t("oublie.identifiant")} erreur={erreur}>
              {(id) => (
                <Input
                  id={id}
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  placeholder={t("oublie.identifiantExemple")}
                  autoComplete="username"
                  required
                />
              )}
            </Champ>
            <Button type="submit" chargement={envoi} className="w-full">
              {t("oublie.envoyer")}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="border-t border-border-subtle pt-4">
        <p className="text-sm leading-relaxed text-text-secondary">{t("oublie.sansEmail")}</p>
        {(parametres.telephone_contact || parametres.email_contact) && (
          <div className="mt-3 flex flex-col gap-2">
            {parametres.telephone_contact && (
              <a
                href={`https://wa.me/${parametres.telephone_contact.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-primary"
              >
                WhatsApp : {parametres.telephone_contact}
              </a>
            )}
            {parametres.email_contact && (
              <a href={`mailto:${parametres.email_contact}`} className="rounded-xl bg-bg-secondary px-4 py-3 text-sm font-semibold text-text-primary">
                {parametres.email_contact}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
