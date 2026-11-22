import { motion } from "motion/react";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { SqueletteListe, Vide } from "@/components/ui/Divers";
import { Champ, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination, usePageLocale } from "@/components/ui/Pagination";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur } from "@/lib/api";
import { cn, formatDate, formatMontant, locale } from "@/lib/utils";

type Statut = "paye" | "non_paye" | "en_retard";
type Moyen = "wave" | "orange_money" | "autre";

interface CaseMois {
  id: number;
  statut: Statut;
  montant: string;
  moyen_paiement: Moyen | "";
  reference_transaction: string;
  date_paiement: string | null;
}

interface LigneMembre {
  id: number;
  nom_complet: string;
  telephone: string;
  carte_numero: string;
  sans_compte: boolean;
  cotisations: Record<string, CaseMois>;
  total_paye: string;
  reste: string;
}

interface DonneesAnnee {
  annee: number;
  montant_defaut: string;
  membres: LigneMembre[];
}

const COULEURS: Record<Statut | "vide", string> = {
  paye: "bg-[#1E7A5D] text-white border-transparent",
  en_retard: "bg-status-error-bg text-status-error border-status-error/40",
  non_paye: "bg-status-warning-bg text-status-warning-text border-status-warning/50",
  vide: "bg-transparent text-text-secondary/50 border-dashed border-border-subtle",
};

const simplifier = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Vue de l'année pour la Finance : une ligne par membre, 12 cases de mois.
 * Toucher une case : encaisser ce mois, voir le paiement ou l'annuler.
 */
export function VueAnnee({ annee, onChange }: { annee: number; onChange?: () => void }) {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const [donnees, setDonnees] = useState<DonneesAnnee | null>(null);
  const [recherche, setRecherche] = useState("");
  const [retardataires, setRetardataires] = useState(false);
  const [choix, setChoix] = useState<{ membre: LigneMembre; mois: number } | null>(null);
  const [moyen, setMoyen] = useState<Moyen>("wave");
  const [reference, setReference] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = () =>
    api
      .get<DonneesAnnee>(`/finances/annee/?annee=${annee}`)
      .then((res) => setDonnees(res.data))
      .catch(() => setDonnees({ annee, montant_defaut: "0", membres: [] }));

  useEffect(() => {
    setDonnees(null);
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annee]);

  const visibles = useMemo(() => {
    const q = simplifier(recherche.trim());
    return (donnees?.membres ?? []).filter(
      (m) =>
        (!retardataires || Number(m.reste) > 0) &&
        (!q || simplifier(`${m.nom_complet} ${m.telephone} ${m.carte_numero}`).includes(q)),
    );
  }, [donnees, recherche, retardataires]);
  const pages = usePageLocale(donnees ? visibles : null, `${annee}|${recherche}|${retardataires}`);

  const nomsMois = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i).toLocaleDateString(locale(), { month: "short" }).replace(".", ""),
  );
  const nomLong = (m: number) => new Date(2000, m - 1).toLocaleDateString(locale(), { month: "long" });

  const ouvrir = (membre: LigneMembre, mois: number) => {
    setMoyen("wave");
    setReference("");
    setChoix({ membre, mois });
  };

  const agir = async (appel: () => Promise<unknown>, message: string) => {
    setEnvoi(true);
    try {
      await appel();
      notifier(message);
      setChoix(null);
      await charger();
      onChange?.();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const caseChoisie = choix ? choix.membre.cotisations[String(choix.mois)] : undefined;
  const encaisser = () => {
    if (!choix || !donnees) return;
    const corps = { statut: "paye", moyen_paiement: moyen, reference_transaction: reference.trim() };
    agir(
      () =>
        caseChoisie
          ? api.patch(`/finances/cotisations/${caseChoisie.id}/`, corps)
          : api.post("/finances/cotisations/", {
              ...corps,
              membre: choix.membre.id,
              mois: choix.mois,
              annee,
              montant: donnees.montant_defaut,
            }),
      t("finance.encaissee", { nom: choix.membre.nom_complet }),
    );
  };

  if (!donnees) return <SqueletteListe lignes={5} />;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("admin.rechercherMembre")} className="ps-11" />
        </div>
        <button
          type="button"
          onClick={() => setRetardataires((r) => !r)}
          aria-pressed={retardataires}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95",
            retardataires ? "border-status-error bg-status-error-bg text-status-error" : "border-border-subtle text-text-secondary",
          )}
        >
          {t("finance.retardatairesSeulement")}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-text-secondary">
        {(["paye", "en_retard", "non_paye", "vide"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("h-3.5 w-3.5 rounded border", COULEURS[s])} /> {t(`finance.legende.${s}`)}
          </span>
        ))}
      </div>

      {visibles.length ? (
        <div ref={pages.ref} className="flex flex-col gap-2">
          {(pages.elements ?? []).map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-text-primary">
                    <span className="truncate">{m.nom_complet}</span>
                    {m.sans_compte && <Badge className="shrink-0 text-[10px]">{t("finance.sansCompte")}</Badge>}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-bold tabular-nums",
                      Number(m.reste) > 0 ? "text-status-error" : Object.keys(m.cotisations).length ? "text-accent-primary" : "font-medium text-text-secondary",
                    )}
                  >
                    {Number(m.reste) > 0
                      ? t("finance.resteDu", { montant: formatMontant(m.reste) })
                      : Object.keys(m.cotisations).length
                        ? t("finance.aJour")
                        : t("finance.aucuneCotisation")}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                  {nomsMois.map((nom, index) => {
                    const c = m.cotisations[String(index + 1)];
                    return (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => ouvrir(m, index + 1)}
                        title={`${nomLong(index + 1)} : ${c ? t(`cotisations.statuts.${c.statut}`) : t("finance.legende.vide")}`}
                        className={cn(
                          "flex h-10 flex-col items-center justify-center rounded-lg border text-[10px] font-bold capitalize leading-none transition-transform active:scale-90",
                          COULEURS[c?.statut ?? "vide"],
                        )}
                      >
                        {nom}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ))}
          <Pagination page={pages.page} nbPages={pages.nbPages} onChange={pages.changer} />
        </div>
      ) : (
        <Vide icone={Search} titre={t("finance.aucunResultat")} />
      )}

      <Modal
        ouvert={!!choix}
        onFermer={() => setChoix(null)}
        titre={choix ? `${choix.membre.nom_complet}` : ""}
        description={choix ? `${nomLong(choix.mois)} ${annee}` : undefined}
        pied={
          caseChoisie?.statut === "paye" ? (
            <>
              <Button
                variant="ghost"
                className="text-status-error"
                chargement={envoi}
                onClick={() =>
                  caseChoisie &&
                  agir(
                    () => api.patch(`/finances/cotisations/${caseChoisie.id}/`, { statut: "non_paye", moyen_paiement: "", reference_transaction: "" }),
                    t("finance.paiementAnnule"),
                  )
                }
              >
                {t("finance.annulerPaiement")}
              </Button>
              <Button onClick={() => setChoix(null)}>{t("commun.fermer")}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setChoix(null)}>
                {t("commun.annuler")}
              </Button>
              <Button chargement={envoi} onClick={encaisser}>
                {t("finance.confirmerPaiement")}
              </Button>
            </>
          )
        }
      >
        {caseChoisie?.statut === "paye" ? (
          <div className="rounded-2xl bg-accent-soft p-4 text-sm text-text-primary">
            <p className="font-semibold">
              {t("cotisations.statuts.paye")} · {formatMontant(caseChoisie.montant)}
            </p>
            <p className="mt-1 text-text-secondary">
              {[
                caseChoisie.date_paiement && formatDate(caseChoisie.date_paiement),
                caseChoisie.moyen_paiement && t(`cotisations.moyens.${caseChoisie.moyen_paiement}`),
                caseChoisie.reference_transaction,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              {caseChoisie
                ? t("finance.aEncaisser", { montant: formatMontant(caseChoisie.montant) })
                : t("finance.pasDeCotisation", { montant: formatMontant(donnees.montant_defaut) })}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["wave", "orange_money", "autre"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoyen(m)}
                  aria-pressed={moyen === m}
                  className={cn(
                    "rounded-xl border-2 px-2 py-2.5 text-xs font-semibold transition",
                    moyen === m ? "border-accent-primary bg-accent-soft text-text-primary" : "border-border-subtle text-text-secondary",
                  )}
                >
                  {t(`cotisations.moyens.${m}`)}
                </button>
              ))}
            </div>
            <Champ label={t("finance.reference")} optionnel={t("commun.optionnel")} aide={t("finance.referenceAide")}>
              {(id) => <Input id={id} value={reference} onChange={(e) => setReference(e.target.value)} />}
            </Champ>
          </div>
        )}
      </Modal>
    </div>
  );
}
