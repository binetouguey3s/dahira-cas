import { motion } from "motion/react";
import { ChevronRight, CreditCard, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { FormulaireProfil } from "@/components/metier/FormulaireProfil";
import { PhotoProfil } from "@/components/metier/PhotoProfil";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { EnTete } from "@/components/ui/Divers";
import { Champ, MotDePasseInput } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur, type Membre } from "@/lib/api";
import { champsManquants, progressionProfil } from "@/lib/carte";
import { formatDate } from "@/lib/utils";

function ModalMotDePasse({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const differents = confirmation && nouveau !== confirmation;

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await api.post("/comptes/moi/mot-de-passe/", { ancien, nouveau });
      notifier(t("profil.motDePasseModifie"));
      setAncien("");
      setNouveau("");
      setConfirmation("");
      onFermer();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      titre={t("profil.changerMotDePasse")}
      pied={
        <>
          <Button variant="outline" onClick={onFermer}>
            {t("commun.annuler")}
          </Button>
          <Button onClick={enregistrer} chargement={envoi} disabled={!ancien || nouveau.length < 8 || !!differents}>
            {t("commun.enregistrer")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Champ label={t("profil.motDePasseActuel")}>
          {(id) => <MotDePasseInput id={id} value={ancien} onChange={(e) => setAncien(e.target.value)} autoComplete="current-password" />}
        </Champ>
        <Champ label={t("profil.nouveauMotDePasse")} aide={t("inscription.aideMotDePasse")}>
          {(id) => <MotDePasseInput id={id} value={nouveau} onChange={(e) => setNouveau(e.target.value)} autoComplete="new-password" />}
        </Champ>
        <Champ label={t("profil.confirmerMotDePasse")} erreur={differents ? t("profil.motsDePasseDifferents") : undefined}>
          {(id) => (
            <MotDePasseInput id={id} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" />
          )}
        </Champ>
      </div>
    </Modal>
  );
}

export default function Profil() {
  const { t } = useTranslation();
  const { membre, deconnecter, mettreAJour, remplacer } = useAuth();
  const { notifier } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mdpOuvert, setMdpOuvert] = useState(false);

  if (!membre) return null;
  const progression = progressionProfil(membre);
  const manquants = champsManquants(membre);

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

  const supprimerPhoto = async () => {
    try {
      const { data } = await api.delete<Membre>("/comptes/moi/photo/");
      remplacer(data);
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    }
  };

  return (
    <AppShell>
      <EnTete surTitre={t("nav.monEspace")} titre={t("nav.profil")} />

      {params.get("bienvenue") && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl bg-accent-secondary/15 p-4 text-sm text-text-primary"
        >
          <span>
            <strong>{t("inscription.bienvenue")}</strong> {t("profil.bienvenueAide")}
          </span>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col items-center gap-4 p-6 text-center">
            <PhotoProfil nom={membre.nom_complet} photo={membre.photo} onEnvoyer={envoyerPhoto} onSupprimer={supprimerPhoto} />
            <div>
              <h2 className="text-lg font-bold text-text-primary">{membre.nom_complet}</h2>
              <p className="text-sm text-text-secondary">{membre.telephone}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge tone="success">N° {membre.carte_numero}</Badge>
              {membre.role !== "membre" && (
                <Badge tone="or">
                  <ShieldCheck className="h-3 w-3" /> {t(`roles.${membre.role}`)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {t("profil.membreDepuis")} {formatDate(membre.date_inscription)}
            </p>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-text-primary">{t("profil.completude")}</span>
              <span className="font-bold tabular-nums text-accent-primary">{progression}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${progression}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            {manquants.length > 0 && (
              <p className="mt-3 text-xs text-text-secondary">
                {t("profil.manquePourCarte")} {manquants.map((c) => t(c === "nom_complet" ? "champs.nomComplet" : "champs.photo")).join(", ")}
              </p>
            )}
          </Card>

          <Link to="/carte">
            <Card className="group flex items-center gap-3 bg-gradient-to-br from-[#0B3D2E] to-[#1E7A5D] p-4 text-white transition hover:-translate-y-0.5">
              <CreditCard className="h-6 w-6 text-[#D9C89A]" />
              <span className="flex-1">
                <span className="block font-semibold">{t("carte.maCarte")}</span>
                <span className="block text-xs text-white/75">{t("carte.genererImprimer")}</span>
              </span>
              <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1 rtl:rotate-180" />
            </Card>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setMdpOuvert(true)}>
              <KeyRound className="h-4 w-4" /> {t("profil.motDePasse")}
            </Button>
            <Button
              variant="outline"
              className="text-status-error hover:border-status-error"
              onClick={() => {
                deconnecter();
                navigate("/connexion");
              }}
            >
              <LogOut className="h-4 w-4" /> {t("profil.deconnexion")}
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="mb-1 text-lg font-bold text-text-primary">{t("profil.mesInformations")}</h2>
          <p className="mb-5 text-sm text-text-secondary">{t("profil.mesInformationsAide")}</p>
          <FormulaireProfil />
        </Card>
      </div>

      <ModalMotDePasse ouvert={mdpOuvert} onFermer={() => setMdpOuvert(false)} />
    </AppShell>
  );
}
