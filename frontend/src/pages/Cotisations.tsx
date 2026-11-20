import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Clock, Copy, Smartphone, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { ElementAnime, EnTete, ListeAnimee, SqueletteListe, Stat, Vide } from "@/components/ui/Divers";
import { Pagination, usePageLocale } from "@/components/ui/Pagination";
import { useParametres } from "@/context/ParametresContext";
import { useToast } from "@/context/ToastContext";
import { toutesLesPages, type Cotisation } from "@/lib/api";
import { TONS_STATUT } from "@/lib/statuts";
import { formatDate, formatMois, formatMontant, locale } from "@/lib/utils";

export default function Cotisations() {
  const { t } = useTranslation();
  const { parametres } = useParametres();
  const { notifier } = useToast();
  const [cotisations, setCotisations] = useState<Cotisation[] | null>(null);
  const [moisActif, setMoisActif] = useState<number | null>(null);
  const annee = new Date().getFullYear();

  useEffect(() => {
    toutesLesPages<Cotisation>("/finances/cotisations/?ordering=-annee,-mois")
      .then(setCotisations)
      .catch(() => setCotisations([]));
  }, []);

  const liste = cotisations ?? [];
  const pages = usePageLocale(cotisations);
  const payeesAnnee = liste.filter((c) => c.annee === annee && c.statut === "paye");
  const totalAnnee = payeesAnnee.reduce((s, c) => s + Number(c.montant), 0);
  const aRegler = liste.filter((c) => c.statut !== "paye");
  const resteARegler = aRegler.reduce((s, c) => s + Number(c.montant), 0);
  const moisPayes = new Set(payeesAnnee.map((c) => c.mois));

  const copier = async (numero: string) => {
    try {
      await navigator.clipboard.writeText(numero);
      notifier(t("commun.numeroCopie"));
    } catch {
      /* ignore */
    }
  };

  return (
    <AppShell>
      <EnTete surTitre={t("nav.monEspace")} titre={t("nav.cotisations")} sousTitre={t("cotisations.sousTitre")} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat icone={Wallet} label={t("cotisations.payeCetteAnnee", { annee })} valeur={formatMontant(totalAnnee)} />
        <Stat
          icone={Clock}
          ton={resteARegler ? "rouge" : "vert"}
          label={t("cotisations.resteARegler")}
          valeur={formatMontant(resteARegler)}
        />
        <div className="col-span-2 md:col-span-1">
          <Stat icone={CheckCircle2} ton="or" label={t("cotisations.moisAJour")} valeur={`${moisPayes.size} / 12`} />
        </div>
      </div>

      {/* Frise de l'année */}
      <Card className="mb-6 p-5">
        <p className="mb-3 text-sm font-semibold text-text-primary">{t("cotisations.annee", { annee })}</p>
        <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const c = liste.find((x) => x.annee === annee && x.mois === m);
            const couleur =
              c?.statut === "paye"
                ? "bg-accent-primary text-white"
                : c
                  ? "bg-status-error-bg text-status-error"
                  : "bg-bg-secondary text-text-secondary";
            return (
              <div key={m} className="relative">
                <AnimatePresence>
                  {moisActif === m && (
                    <motion.div
                      role="tooltip"
                      id={`mois-${m}`}
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.16 }}
                      className={`pointer-events-none absolute bottom-full z-20 mb-2 whitespace-nowrap rounded-xl bg-text-primary px-3 py-1.5 text-center text-xs font-semibold text-bg-primary shadow-lg ${
                        m % 6 === 1 ? "start-0" : m % 6 === 0 ? "end-0" : "left-1/2 -translate-x-1/2"
                      }`}
                    >
                      <span className="block capitalize">{formatMois(m, annee)}</span>
                      <span className="block font-normal opacity-80">
                        {c ? t(`cotisations.statuts.${c.statut}`) : t("cotisations.pasEncore")}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ delay: m * 0.03 }}
                  onClick={() => setMoisActif((a) => (a === m ? null : m))}
                  // Survol seulement à la souris : au doigt, c'est le toucher qui ouvre / ferme la bulle.
                  onPointerEnter={(e) => e.pointerType === "mouse" && setMoisActif(m)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setMoisActif((a) => (a === m ? null : a))}
                  onBlur={() => setMoisActif((a) => (a === m ? null : a))}
                  aria-label={`${formatMois(m, annee)} : ${c ? t(`cotisations.statuts.${c.statut}`) : t("cotisations.pasEncore")}`}
                  aria-describedby={moisActif === m ? `mois-${m}` : undefined}
                  className={`flex h-11 w-full items-center justify-center rounded-xl text-xs font-bold capitalize transition-shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-primary/25 ${couleur} ${
                    moisActif === m ? "ring-2 ring-accent-primary/40" : ""
                  }`}
                >
                  {new Date(annee, m - 1).toLocaleDateString(locale(), { month: "narrow" })}
                </motion.button>
              </div>
            );
          })}
        </div>
      </Card>

      {(parametres.numero_wave || parametres.numero_orange_money) && (
        <Card className="mb-6 bg-gradient-to-br from-accent-soft to-bg-elevated p-5">
          <p className="mb-1 flex items-center gap-2 font-semibold text-text-primary">
            <Smartphone className="h-4 w-4 text-accent-primary" /> {t("cotisations.commentPayer")}
          </p>
          <p className="mb-4 text-sm text-text-secondary">
            {t("cotisations.commentPayerAide", { montant: formatMontant(parametres.montant_cotisation) })}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Wave", parametres.numero_wave, "#1DC8F2"],
              ["Orange Money", parametres.numero_orange_money, "#FF7900"],
            ]
              .filter(([, numero]) => numero)
              .map(([nom, numero, couleur]) => (
                <button
                  key={nom}
                  onClick={() => copier(numero)}
                  className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3 text-start transition hover:border-accent-primary"
                >
                  <span>
                    <span className="block text-xs font-bold" style={{ color: couleur }}>
                      {nom}
                    </span>
                    <span className="font-semibold tabular-nums text-text-primary">{numero}</span>
                  </span>
                  <Copy className="h-4 w-4 text-text-secondary" />
                </button>
              ))}
          </div>
        </Card>
      )}

      <h2 className="mb-3 text-lg font-bold text-text-primary">{t("cotisations.historique")}</h2>
      {cotisations === null ? (
        <SqueletteListe />
      ) : liste.length ? (
        <div ref={pages.ref}>
        <ListeAnimee key={pages.page} className="flex flex-col gap-2">
          {(pages.elements ?? []).map((c) => (
            <ElementAnime key={c.id}>
              <Card className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold capitalize text-text-primary">{formatMois(c.mois, c.annee)}</p>
                  <p className="text-sm text-text-secondary">
                    {formatMontant(c.montant)}
                    {c.date_paiement && ` · ${t("cotisations.payeeLe", { date: formatDate(c.date_paiement) })}`}
                    {c.moyen_paiement && ` · ${t(`cotisations.moyens.${c.moyen_paiement}`)}`}
                  </p>
                </div>
                <Badge tone={TONS_STATUT[c.statut]}>{t(`cotisations.statuts.${c.statut}`)}</Badge>
              </Card>
            </ElementAnime>
          ))}
        </ListeAnimee>
        <Pagination page={pages.page} nbPages={pages.nbPages} onChange={pages.changer} />
        </div>
      ) : (
        <Vide icone={Wallet} titre={t("cotisations.aucuneCotisation")} message={t("cotisations.aucuneCotisationAide")} />
      )}
    </AppShell>
  );
}
