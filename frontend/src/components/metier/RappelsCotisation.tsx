import { AlertTriangle, MailWarning, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Champ, Interrupteur, Select } from "@/components/ui/Input";
import { Confirmation } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur } from "@/lib/api";
import { formatDate, formatDateHeure } from "@/lib/utils";

interface EtatRappels {
  actifs: boolean;
  jour_envoi: number;
  dernier_envoi_auto: string | null;
  dernier_envoi_manuel: string | null;
  prochain_envoi: string | null;
  emails_actifs: boolean;
  apercu: { concernes: number; avec_email: number; sans_email: number };
}

/** Espace Finance : rappels de cotisation par e-mail (automatiques chaque mois + envoi immédiat). */
export function RappelsCotisation({ onEnvoye }: { onEnvoye?: () => void }) {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const [etat, setEtat] = useState<EtatRappels | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(() => {
    api
      .get<EtatRappels>("/finances/rappels/")
      .then(({ data }) => setEtat(data))
      .catch(() => setEtat(null));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const regler = async (changement: Partial<Pick<EtatRappels, "actifs" | "jour_envoi">>) => {
    if (!etat) return;
    setEtat({ ...etat, ...changement });
    try {
      const { data } = await api.patch<EtatRappels>("/finances/rappels/", changement);
      setEtat(data);
      notifier(t("commun.enregistre"));
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
      charger();
    }
  };

  const envoyer = async () => {
    setEnvoi(true);
    try {
      const { data } = await api.post<{ envoyes: number }>("/finances/rappels/envoyer/");
      notifier(t("rappels.envoyes", { count: data.envoyes }));
      setConfirmer(false);
      charger();
      onEnvoye?.();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  if (!etat) return null;
  const { concernes, avec_email, sans_email } = etat.apercu;

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-primary">
          <Send className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-text-primary">{t("rappels.titre")}</h2>
          <p className="text-sm text-text-secondary">{t("rappels.aide")}</p>
        </div>
      </div>

      {!etat.emails_actifs && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-status-warning-bg px-3 py-2.5 text-sm text-status-warning-text">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0" /> {t("rappels.emailsInactifs")}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Interrupteur
            coche={etat.actifs}
            onChange={(actifs) => regler({ actifs })}
            label={t("rappels.automatique")}
            description={
              etat.actifs && etat.prochain_envoi
                ? t("rappels.prochain", { date: formatDate(etat.prochain_envoi) })
                : t("rappels.desactive")
            }
          />
          <Champ label={t("rappels.jour")}>
            {(id) => (
              <Select id={id} value={etat.jour_envoi} disabled={!etat.actifs} onChange={(e) => regler({ jour_envoi: Number(e.target.value) })}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((j) => (
                  <option key={j} value={j}>
                    {t("rappels.leJour", { jour: j })}
                  </option>
                ))}
              </Select>
            )}
          </Champ>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-bg-secondary/60 p-4">
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-text-primary">{t("rappels.concernes", { count: concernes })}</p>
            <p className="text-text-secondary">{t("rappels.avecEmail", { count: avec_email })}</p>
            {sans_email > 0 && (
              <p className="flex items-start gap-1.5 text-text-secondary">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning" />
                {t("rappels.sansEmail", { count: sans_email })}
              </p>
            )}
            {etat.dernier_envoi_manuel && (
              <p className="text-xs text-text-secondary">{t("rappels.dernierEnvoi", { date: formatDateHeure(etat.dernier_envoi_manuel) })}</p>
            )}
          </div>
          <Button onClick={() => setConfirmer(true)} disabled={!avec_email || !etat.emails_actifs} className="w-full">
            <Send className="h-4 w-4" /> {t("rappels.envoyerMaintenant")}
          </Button>
        </div>
      </div>

      <p className="mt-4 text-xs text-text-secondary">{t("rappels.generationAuto")}</p>

      <Confirmation
        ouvert={confirmer}
        onFermer={() => setConfirmer(false)}
        onConfirmer={envoyer}
        chargement={envoi}
        danger={false}
        titre={t("rappels.confirmerTitre")}
        message={t("rappels.confirmerMessage", { count: avec_email })}
        libelleConfirmer={t("rappels.envoyer")}
      />
    </Card>
  );
}
