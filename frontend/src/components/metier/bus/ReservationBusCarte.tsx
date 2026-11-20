import { AnimatePresence, motion } from "motion/react";
import { Bus, ClipboardList, Pencil, Wallet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Confirmation } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur, type Evenement, type PassagerBus } from "@/lib/api";
import { cn, formatDateHeure, formatMontant } from "@/lib/utils";

import { BadgePaiement, BadgeStatut, CarteResponsable, ListePassagers, LogoMoyen, nomMoyen, passagersValides } from "./Commun";
import { FormulairePaiement } from "./FormulairePaiement";

/** Réservation de bus d'un événement, côté membre. */
export function ReservationBusCarte({ evenement, onChange }: { evenement: Evenement; onChange: () => Promise<unknown> }) {
  const { t } = useTranslation();
  const { membre } = useAuth();
  const { notifier } = useToast();
  const resa = evenement.ma_reservation;
  const [passagers, setPassagers] = useState<PassagerBus[]>([{ nom: "", est_titulaire: true }]);
  const [edition, setEdition] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [annulation, setAnnulation] = useState(false);
  const [paiement, setPaiement] = useState(false);

  const prix = Number(evenement.prix_place ?? 0);
  const capacite = (evenement.nb_bus ?? 0) * (evenement.places_par_bus ?? 0);
  const occupees = capacite - evenement.places_restantes;
  // Places disponibles pour ce formulaire (celles déjà réservées par le membre comptent en plus).
  const disponibles = evenement.places_restantes + (edition && resa ? resa.nb_places : 0);
  const trop = passagers.length > disponibles;

  const commencerModification = () => {
    if (!resa) return;
    setPassagers(resa.passagers.map((p) => ({ id: p.id, nom: p.est_titulaire ? "" : p.nom, est_titulaire: p.est_titulaire })));
    setEdition(true);
  };

  const enregistrer = async () => {
    setEnvoi(true);
    const corps = { passagers: passagers.map((p) => ({ ...p, nom: p.nom.trim() })) };
    try {
      if (resa && edition) await api.patch(`/evenements/reservations-bus/${resa.id}/`, corps);
      else await api.post("/evenements/reservations-bus/", { evenement: evenement.id, ...corps });
      notifier(edition ? t("commun.enregistre") : t("bus.reservationEnregistree"));
      setEdition(false);
    } catch (err) {
      notifier(messageErreur(err, t("evenements.reservationImpossible")), "erreur");
    } finally {
      await onChange();
      setEnvoi(false);
    }
  };

  const annuler = async () => {
    if (!resa) return;
    setEnvoi(true);
    try {
      await api.delete(`/evenements/reservations-bus/${resa.id}/`);
      notifier(t("evenements.reservationAnnulee"));
      setAnnulation(false);
      setPassagers([{ nom: "", est_titulaire: true }]);
      await onChange();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const formulaire = (
    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-sm font-semibold text-text-primary">{t("bus.quiVoyage")}</p>
        <p className="mb-3 text-xs text-text-secondary">{t("bus.quiVoyageAide")}</p>
        <ListePassagers passagers={passagers} onChange={setPassagers} nomMoi={membre?.nom_complet} />
      </div>
      {trop && <p className="rounded-xl bg-status-error-bg px-3 py-2 text-sm text-status-error">{t("bus.plusQue", { count: disponibles })}</p>}
      {prix > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-bg-secondary px-4 py-3">
          <span className="text-sm text-text-secondary">{t("bus.total", { count: passagers.length })}</span>
          <span className="text-lg font-bold tabular-nums text-text-primary">{formatMontant(prix * passagers.length)}</span>
        </div>
      )}
      <div className="flex gap-2">
        {edition && (
          <Button variant="outline" onClick={() => setEdition(false)}>
            {t("commun.annuler")}
          </Button>
        )}
        <Button className="flex-1" chargement={envoi} disabled={!passagersValides(passagers) || trop} onClick={enregistrer}>
          {edition ? t("commun.enregistrer") : t("bus.reserver", { count: passagers.length })}
        </Button>
      </div>
    </motion.div>
  );

  const reste = resa ? Math.max(Number(resa.montant_du) - Number(resa.montant_paye), 0) : 0;

  return (
    <Card className="h-fit p-5">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-text-primary">
          <Bus className="h-5 w-5 text-accent-primary" /> {t("evenements.busTitre")}
        </h2>
        {prix > 0 && (
          <span className="shrink-0 rounded-full bg-accent-secondary/15 px-3 py-1 text-xs font-bold text-accent-secondary-text">
            {t("bus.parPlace", { montant: formatMontant(prix) })}
          </span>
        )}
      </div>
      <p className="mb-3 text-sm text-text-secondary">{t("bus.aide")}</p>

      {capacite > 0 && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-text-secondary">
            <span>{evenement.places_restantes ? t("evenements.placesRestantes", { count: evenement.places_restantes }) : t("evenements.complet")}</span>
            <span className="tabular-nums">
              {occupees}/{capacite}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border-subtle">
            <motion.div
              className={cn("h-full rounded-full", occupees / capacite > 0.85 ? "bg-status-warning" : "bg-accent-primary")}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((occupees / capacite) * 100)}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      )}

      {evenement.est_responsable && (
        <Button asChild variant="or" size="sm" className="mb-4 w-full">
          <Link to={`/espace-bus/${evenement.id}`}>
            <ClipboardList className="h-4 w-4" /> {t("bus.gererLesBus")}
          </Link>
        </Button>
      )}

      <AnimatePresence mode="wait">
        {!membre ? (
          <Button asChild className="w-full">
            <Link to="/connexion" state={{ depuis: `/evenements/${evenement.id}` }}>
              {t("evenements.connectezVous")}
            </Link>
          </Button>
        ) : resa && !edition ? (
          <motion.div key="resa" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            <div className="rounded-2xl bg-accent-soft p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-semibold text-text-primary">{t("bus.maReservation")}</p>
                <BadgeStatut statut={resa.statut} />
              </div>
              <ul className="flex flex-col gap-1.5">
                {resa.passagers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-text-primary">
                      {p.nom}
                      {p.est_titulaire && <span className="text-text-secondary"> ({t("bus.moi")})</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-bold text-accent-primary">
                      <Bus className="h-3 w-3" /> {p.bus_numero}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {Number(resa.montant_du) > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  [t("bus.aPayer"), resa.montant_du],
                  [t("bus.paye"), resa.montant_paye],
                  [t("bus.reste"), reste],
                ].map(([label, valeur]) => (
                  <div key={String(label)} className="rounded-xl bg-bg-secondary px-1 py-2">
                    <p className="text-[11px] text-text-secondary">{label}</p>
                    <p className="text-sm font-bold tabular-nums text-text-primary">{formatMontant(valeur)}</p>
                  </div>
                ))}
              </div>
            )}
            {Number(resa.montant_a_verifier) > 0 && (
              <p className="rounded-xl bg-status-warning-bg px-3 py-2 text-xs text-status-warning-text">
                {t("bus.enCoursDeVerification", { montant: formatMontant(resa.montant_a_verifier) })}
              </p>
            )}

            {Number(resa.montant_du) > 0 && reste > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-text-primary">{t("bus.commentPayer")}</p>
                <p className="text-xs text-text-secondary">{t("bus.commentPayerAide")}</p>
                {evenement.responsables.map((r) => (
                  <CarteResponsable key={r.id} responsable={r} />
                ))}
                <Button onClick={() => setPaiement(true)}>
                  <Wallet className="h-4 w-4" /> {t("bus.jaiPaye")}
                </Button>
              </div>
            )}

            {resa.paiements.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">{t("bus.historique")}</p>
                <ul className="flex flex-col gap-2">
                  {resa.paiements.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border-subtle px-3 py-2">
                      <LogoMoyen moyen={p.moyen} className="h-8 w-8" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold tabular-nums text-text-primary">
                          {formatMontant(p.montant)} · {nomMoyen(p.moyen, t)}
                        </p>
                        <p className="truncate text-[11px] text-text-secondary">
                          {formatDateHeure(p.declare_le)}
                          {p.responsable_nom && ` · ${p.responsable_nom}`}
                          {p.traite_par_nom && p.statut !== "a_verifier" && ` · ${t("bus.parQui", { nom: p.traite_par_nom })}`}
                        </p>
                      </div>
                      <BadgePaiement statut={p.statut} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Number(resa.montant_du) === 0 && evenement.responsables.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-text-primary">{t("bus.responsables")}</p>
                {evenement.responsables.map((r) => (
                  <CarteResponsable key={r.id} responsable={r} />
                ))}
              </div>
            )}

            {resa.modifiable ? (
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={commencerModification}>
                  <Pencil className="h-4 w-4" /> {t("commun.modifier")}
                </Button>
                <Button variant="outline" className="flex-1 text-status-error" onClick={() => setAnnulation(true)}>
                  {t("evenements.annulerReservation")}
                </Button>
              </div>
            ) : (
              <p className="text-center text-xs text-text-secondary">{t("bus.contacterPourModifier")}</p>
            )}
          </motion.div>
        ) : evenement.places_restantes === 0 && !edition ? (
          <p key="complet" className="rounded-2xl bg-status-error-bg p-4 text-center text-sm font-semibold text-status-error">
            {t("bus.tousComplets")}
          </p>
        ) : (
          formulaire
        )}
      </AnimatePresence>

      {resa && (
        <FormulairePaiement
          ouvert={paiement}
          onFermer={() => setPaiement(false)}
          reservation={resa}
          responsables={evenement.responsables}
          onFait={() => onChange()}
        />
      )}
      <Confirmation
        ouvert={annulation}
        onFermer={() => setAnnulation(false)}
        onConfirmer={annuler}
        titre={t("evenements.annulerReservation")}
        message={t("evenements.annulerConfirmation")}
        libelleConfirmer={t("evenements.annulerReservation")}
        chargement={envoi}
      />
    </Card>
  );
}
