import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Champ, Input, MotDePasseInput } from "@/components/ui/Input";
import { TelephoneInput } from "@/components/ui/TelephoneInput";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { Langue } from "@/i18n";
import { messageErreur } from "@/lib/api";
import { cn } from "@/lib/utils";

function forceMotDePasse(mdp: string) {
  let score = 0;
  if (mdp.length >= 8) score++;
  if (/[A-Z]/.test(mdp) && /[a-z]/.test(mdp)) score++;
  if (/\d/.test(mdp)) score++;
  if (/[^A-Za-z0-9]/.test(mdp) || mdp.length >= 12) score++;
  return score;
}

export default function Inscription() {
  const { t, i18n } = useTranslation();
  const { inscrire } = useAuth();
  const { notifier } = useToast();
  const navigate = useNavigate();

  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [telephoneConfirme, setTelephoneConfirme] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const force = forceMotDePasse(motDePasse);
  // Le numéro est saisi deux fois : une faute de frappe empêcherait le membre de se reconnecter.
  const numerosDifferents = Boolean(telephone && telephoneConfirme) && telephone !== telephoneConfirme;
  const numerosIdentiques = Boolean(telephone) && telephone === telephoneConfirme;
  const couleursForce = ["bg-status-error", "bg-status-error", "bg-status-warning", "bg-accent-primary", "bg-accent-primary"];

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (telephone !== telephoneConfirme) {
      setErreur(t("inscription.numerosDifferents"));
      return;
    }
    setEnvoi(true);
    try {
      await inscrire({
        nom_complet: nomComplet.trim(),
        telephone,
        telephone_confirmation: telephoneConfirme,
        email: email.trim(),
        password: motDePasse,
        langue_preferee: i18n.language as Langue,
      });
      notifier(t("inscription.bienvenue"));
      navigate("/profil?bienvenue=1");
    } catch (err) {
      setErreur(messageErreur(err, t("inscription.erreur")));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AuthLayout titre={t("inscription.titre")} sousTitre={t("inscription.sousTitre")}>
      <form onSubmit={soumettre} className="flex flex-col gap-4">
        <Champ label={t("champs.nomComplet")}>
          {(id) => (
            <Input
              id={id}
              autoComplete="name"
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              placeholder="Awa Ndiaye"
              required
            />
          )}
        </Champ>
        <Champ label={t("champs.telephone")} aide={t("inscription.aideTelephone")}>
          {(id) => (
            <TelephoneInput id={id} valeur={telephone} onChange={setTelephone} required />
          )}
        </Champ>
        <Champ label={t("inscription.confirmerTelephone")} aide={t("inscription.aideConfirmerTelephone")}>
          {(id) => (
            <>
              <TelephoneInput id={id} valeur={telephoneConfirme} onChange={setTelephoneConfirme} required />
              {numerosDifferents && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-status-error" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {t("inscription.numerosDifferents")}
                </p>
              )}
              {numerosIdentiques && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-accent-primary">
                  <Check className="h-3.5 w-3.5 shrink-0" /> {t("inscription.numerosIdentiques")}
                </p>
              )}
            </>
          )}
        </Champ>
        <Champ label={t("champs.email")} optionnel={t("commun.optionnel")} aide={t("profil.aideEmail")}>
          {(id) => (
            <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Champ>
        <Champ label={t("champs.motDePasse")} aide={t("inscription.aideMotDePasse")}>
          {(id) => (
            <>
              <MotDePasseInput
                id={id}
                autoComplete="new-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                minLength={8}
                libelleAfficher={t("champs.afficherMotDePasse")}
                required
              />
              {motDePasse && (
                <div className="mt-1 flex gap-1" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      className={cn("h-1 flex-1 rounded-full", i < force ? couleursForce[force] : "bg-border-subtle")}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.05 }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </Champ>

        <ul className="flex flex-col gap-1.5 rounded-xl bg-bg-secondary/60 p-3 text-xs text-text-secondary">
          {[t("inscription.avantage1"), t("inscription.avantage2"), t("inscription.avantage3")].map((a) => (
            <li key={a} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-accent-primary" /> {a}
            </li>
          ))}
        </ul>

        <AnimatePresence>
          {erreur && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 rounded-xl bg-status-error-bg px-3 py-2.5 text-sm text-status-error"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" chargement={envoi} disabled={numerosDifferents} size="lg" className="w-full">
          {t("inscription.bouton")}
        </Button>

        <p className="text-center text-sm text-text-secondary">
          {t("inscription.dejaMembre")}{" "}
          <Link to="/connexion" className="font-semibold text-accent-primary hover:underline">
            {t("inscription.seConnecter")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
