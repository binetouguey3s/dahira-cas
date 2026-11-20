import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Champ, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur, type MoyenPaiementBus, type ReservationBus, type ResponsableBus } from "@/lib/api";
import { cn, formatMontant } from "@/lib/utils";

import { LogoMoyen, MOYENS, nomMoyen } from "./Commun";

/**
 * Déclarer un paiement (membre : il sera vérifié par un responsable)
 * ou l'enregistrer directement (responsable : validé tout de suite, ex. espèces reçues en main propre).
 */
export function FormulairePaiement({
  ouvert,
  onFermer,
  reservation,
  responsables,
  parResponsable = false,
  onFait,
}: {
  ouvert: boolean;
  onFermer: () => void;
  reservation: ReservationBus;
  responsables: ResponsableBus[];
  parResponsable?: boolean;
  onFait: (reservation: ReservationBus) => void;
}) {
  const { t } = useTranslation();
  const { membre } = useAuth();
  const { notifier } = useToast();
  const reste = Math.max(Number(reservation.montant_du) - Number(reservation.montant_paye) - Number(reservation.montant_a_verifier), 0);
  const [montant, setMontant] = useState("");
  const [moyen, setMoyen] = useState<MoyenPaiementBus>("wave");
  const [responsable, setResponsable] = useState("");
  const [reference, setReference] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setMontant(reste ? String(reste) : "");
    setMoyen(parResponsable ? "especes" : "wave");
    setReference("");
    const moi = responsables.find((r) => r.membre === membre?.id);
    setResponsable(String((parResponsable && moi ? moi : responsables[0])?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  const envoyer = async () => {
    setEnvoi(true);
    try {
      const { data } = await api.post<ReservationBus>(`/evenements/reservations-bus/${reservation.id}/paiements/`, {
        montant: Number(montant),
        moyen,
        responsable: responsable ? Number(responsable) : null,
        reference: moyen === "especes" ? "" : reference.trim(),
      });
      notifier(parResponsable ? t("bus.paiementEnregistre") : t("bus.paiementDeclare"));
      onFait(data);
      onFermer();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const moyens: MoyenPaiementBus[] = ["wave", "orange_money", "especes"];

  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      titre={parResponsable ? t("bus.enregistrerPaiement") : t("bus.jaiPaye")}
      description={parResponsable ? reservation.titulaire_nom : t("bus.jaiPayeAide")}
      pied={
        <>
          <Button variant="outline" onClick={onFermer}>
            {t("commun.annuler")}
          </Button>
          <Button onClick={envoyer} chargement={envoi} disabled={!(Number(montant) > 0)}>
            {parResponsable ? t("bus.valider") : t("bus.envoyer")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-text-primary">{t("bus.moyen")}</p>
          <div className="grid grid-cols-3 gap-2">
            {moyens.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMoyen(m)}
                aria-pressed={moyen === m}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-xs font-semibold transition",
                  moyen === m ? "border-accent-primary bg-accent-soft text-text-primary" : "border-border-subtle text-text-secondary",
                )}
              >
                <LogoMoyen moyen={m} />
                <span className="text-center leading-tight" style={moyen === m ? { color: MOYENS[m].couleur } : undefined}>
                  {nomMoyen(m, t)}
                </span>
              </button>
            ))}
          </div>
        </div>
        <Champ label={t("bus.montant")} aide={reste ? t("bus.resteAPayer", { montant: formatMontant(reste) }) : undefined}>
          {(id) => <Input id={id} type="number" inputMode="numeric" min={1} value={montant} onChange={(e) => setMontant(e.target.value)} />}
        </Champ>
        {responsables.length > 0 && (
          <Champ label={moyen === "especes" ? t("bus.remisA") : t("bus.envoyeA")}>
            {(id) => (
              <Select id={id} value={responsable} onChange={(e) => setResponsable(e.target.value)}>
                {responsables.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </Select>
            )}
          </Champ>
        )}
        {moyen !== "especes" && (
          <Champ label={t("bus.reference")} optionnel={t("commun.optionnel")} aide={t("bus.referenceAide")}>
            {(id) => <Input id={id} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />}
          </Champ>
        )}
      </div>
    </Modal>
  );
}
