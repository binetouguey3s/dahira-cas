import {
  ArrowLeft,
  Banknote,
  Bus,
  Check,
  CheckCircle2,
  Clock,
  Download,
  MessageCircle,
  Phone,
  Printer,
  Search,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import {
  BadgePaiement,
  BadgeStatut,
  ListePassagers,
  LogoMoyen,
  lienWhatsApp,
  nomMoyen,
  passagersValides,
} from "@/components/metier/bus/Commun";
import { FormulairePaiement } from "@/components/metier/bus/FormulairePaiement";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EnTete, Onglets, Squelette, Stat, Vide } from "@/components/ui/Divers";
import { Champ, Input, Interrupteur, Select } from "@/components/ui/Input";
import { Confirmation, Modal } from "@/components/ui/Modal";
import { TelephoneInput } from "@/components/ui/TelephoneInput";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  api,
  messageErreur,
  type GestionBus as Donnees,
  type PaiementBus,
  type PassagerBus,
  type ReservationBus,
  type ResponsableBus,
  type StatutReservationBus,
} from "@/lib/api";
import { cn, formatDateHeure, formatMontant } from "@/lib/utils";

type Onglet = "traiter" | "reservations" | "bus";

/** Pastille de couleur du statut (sur téléphone, à la place du badge). */
const POINT_STATUT: Record<StatutReservationBus, string> = {
  en_attente: "bg-status-warning",
  acceptee: "bg-accent-secondary",
  acompte: "bg-accent-secondary",
  payee: "bg-status-success",
  annulee: "bg-status-error",
};

const simplifier = (texte: string) =>
  texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const echapper = (texte: string) =>
  texte.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Appeler / écrire sur WhatsApp à un membre. */
function Contact({ telephone }: { telephone: string }) {
  const { t } = useTranslation();
  if (!telephone) return null;
  return (
    <span className="flex shrink-0 gap-1">
      <a href={`tel:${telephone}`} aria-label={t("bus.appeler")} className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary hover:bg-accent-soft">
        <Phone className="h-4 w-4" />
      </a>
      <a
        href={lienWhatsApp(telephone)}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
    </span>
  );
}

/** Les numéros Wave / Orange Money du responsable connecté, modifiables. */
function MesNumeros({ responsable, onEnregistre }: { responsable: ResponsableBus; onEnregistre: () => void }) {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const [wave, setWave] = useState(responsable.numero_wave);
  const [om, setOm] = useState(responsable.numero_orange_money);
  const [especes, setEspeces] = useState(responsable.accepte_especes);
  const [envoi, setEnvoi] = useState(false);
  const change = wave !== responsable.numero_wave || om !== responsable.numero_orange_money || especes !== responsable.accepte_especes;

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await api.patch(`/evenements/responsables-bus/${responsable.id}/`, {
        numero_wave: wave.trim(),
        numero_orange_money: om.trim(),
        accepte_especes: especes,
      });
      notifier(t("commun.enregistre"));
      onEnregistre();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Card className="mb-6 p-5">
      <p className="mb-1 font-semibold text-text-primary">{t("bus.mesNumeros")}</p>
      <p className="mb-4 text-sm text-text-secondary">{t("bus.mesNumerosAide")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label={<span className="inline-flex items-center gap-2"><LogoMoyen moyen="wave" className="h-6 w-6 text-[9px]" /> Wave</span>}>
          {(id) => <Input id={id} type="tel" value={wave} onChange={(e) => setWave(e.target.value)} />}
        </Champ>
        <Champ label={<span className="inline-flex items-center gap-2"><LogoMoyen moyen="orange_money" className="h-6 w-6 text-[9px]" /> Orange Money</span>}>
          {(id) => <Input id={id} type="tel" value={om} onChange={(e) => setOm(e.target.value)} />}
        </Champ>
        <div className="sm:col-span-2">
          <Interrupteur coche={especes} onChange={setEspeces} label={t("bus.accepteEspeces")} />
        </div>
      </div>
      {change && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={enregistrer} chargement={envoi}>
            {t("commun.enregistrer")}
          </Button>
        </div>
      )}
    </Card>
  );
}

function LignePaiement({ paiement, actions }: { paiement: PaiementBus; actions?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle px-3 py-2">
      <LogoMoyen moyen={paiement.moyen} className="h-8 w-8" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tabular-nums text-text-primary">
          {formatMontant(paiement.montant)} · {nomMoyen(paiement.moyen, t)}
          {paiement.reference && <span className="font-normal text-text-secondary"> · {t("bus.ref")} {paiement.reference}</span>}
        </p>
        <p className="text-[11px] text-text-secondary">
          {formatDateHeure(paiement.declare_le)}
          {paiement.responsable_nom && ` · ${t("bus.versQui", { nom: paiement.responsable_nom })}`}
          {paiement.traite_par_nom && paiement.statut !== "a_verifier" && ` · ${t("bus.parQui", { nom: paiement.traite_par_nom })}`}
        </p>
      </div>
      {actions ?? <BadgePaiement statut={paiement.statut} />}
    </div>
  );
}

export default function GestionBus() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { membre } = useAuth();
  const { notifier } = useToast();
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("traiter");
  const [recherche, setRecherche] = useState("");
  const [paiementPour, setPaiementPour] = useState<ReservationBus | null>(null);
  const [aAnnuler, setAAnnuler] = useState<ReservationBus | null>(null);
  const [ajout, setAjout] = useState(false);
  const [contact, setContact] = useState({ nom: "", telephone: "" });
  const [passagers, setPassagers] = useState<PassagerBus[]>([{ nom: "" }]);
  const [occupe, setOccupe] = useState<string | null>(null);

  const charger = () =>
    api
      .get<Donnees>(`/evenements/evenements/${id}/gestion-bus/`)
      .then((res) => setDonnees(res.data))
      .catch(() => setErreur(true));

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const action = async (cle: string, appel: () => Promise<unknown>, message: string) => {
    setOccupe(cle);
    try {
      await appel();
      notifier(message);
      await charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setOccupe(null);
    }
  };

  const reservations = donnees?.reservations ?? [];
  const actives = reservations.filter((r) => !r.annulee);
  const aVerifier = actives.flatMap((r) => r.paiements.filter((p) => p.statut === "a_verifier").map((p) => ({ p, r })));
  const enAttente = actives.filter((r) => !r.acceptee);
  const resultats = useMemo(() => {
    const q = simplifier(recherche.trim());
    if (!q) return reservations;
    return reservations.filter(
      (r) =>
        simplifier(r.titulaire_nom).includes(q) ||
        r.titulaire_telephone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§") ||
        r.passagers.some((p) => simplifier(p.nom).includes(q)),
    );
  }, [recherche, reservations]);

  if (erreur)
    return (
      <AppShell>
        <Vide icone={Bus} titre={t("bus.accesRefuse")} action={<Button asChild><Link to="/espace-bus">{t("nav.espaceBus")}</Link></Button>} />
      </AppShell>
    );

  if (!donnees)
    return (
      <AppShell large>
        <Squelette className="mb-4 h-24 w-full" />
        <Squelette className="h-64 w-full" />
      </AppShell>
    );

  const { evenement, bus, totaux } = donnees;
  const payant = Number(evenement.prix_place ?? 0) > 0;
  const moi = evenement.responsables.find((r) => r.membre === membre?.id);

  const exporterCSV = () => {
    const lignes = [
      [t("bus.colBus"), t("bus.colPassager"), t("bus.colReservePar"), t("bus.colTelephone"), t("bus.colStatut"), t("bus.aPayer"), t("bus.paye")],
      ...bus.flatMap((b) =>
        b.passagers.map((p) => {
          const r = reservations.find((x) => x.id === p.reservation);
          return [b.numero, p.nom, p.titulaire_nom, p.titulaire_telephone, t(`bus.statuts.${p.statut}`), r?.montant_du ?? "", r?.montant_paye ?? ""];
        }),
      ),
    ];
    const csv = "﻿" + lignes.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `bus-${evenement.titre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
  };

  /** Liste imprimable : une page par bus, avec une case à cocher pour l'appel au départ. */
  const imprimer = () => {
    const fenetre = window.open("", "_blank");
    if (!fenetre) return;
    const pages = bus
      .map(
        (b) => `<section><h2>${echapper(t("evenements.busNumero", { numero: b.numero }))} — ${b.passagers.length}/${b.places_total}</h2>
<table><thead><tr><th>#</th><th>${echapper(t("bus.colPassager"))}</th><th>${echapper(t("bus.colReservePar"))}</th><th>${echapper(t("bus.colTelephone"))}</th><th>${echapper(t("bus.colStatut"))}</th><th>✓</th></tr></thead><tbody>
${b.passagers
  .map(
    (p, i) =>
      `<tr><td>${i + 1}</td><td>${echapper(p.nom)}</td><td>${p.est_titulaire ? "" : echapper(p.titulaire_nom)}</td><td>${echapper(p.titulaire_telephone)}</td><td>${echapper(t(`bus.statuts.${p.statut}`))}</td><td class="case"></td></tr>`,
  )
  .join("")}</tbody></table></section>`,
      )
      .join("");
    fenetre.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${echapper(evenement.titre)}</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#555}
section{page-break-after:always}h2{font-size:16px;margin:20px 0 8px}table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:start}th{background:#f2f2f2}.case{width:28px}</style></head>
<body><h1>${echapper(evenement.titre)}</h1><p>${echapper(formatDateHeure(evenement.date))}${evenement.lieu ? " · " + echapper(evenement.lieu) : ""}</p>${pages}</body></html>`);
    fenetre.document.close();
    fenetre.focus();
    fenetre.print();
  };

  const ajouterReservation = () =>
    action(
      "ajout",
      async () => {
        await api.post("/evenements/reservations-bus/", {
          evenement: evenement.id,
          nom_contact: contact.nom.trim(),
          telephone_contact: contact.telephone,
          passagers: passagers.map((p) => ({ nom: p.nom.trim() })),
        });
        setAjout(false);
        setContact({ nom: "", telephone: "" });
        setPassagers([{ nom: "" }]);
      },
      t("bus.reservationEnregistree"),
    );

  const carteReservation = (r: ReservationBus) => {
    const reste = Math.max(Number(r.montant_du) - Number(r.montant_paye), 0);
    return (
      <Card key={r.id} className={cn("flex flex-col gap-3 p-4", r.annulee && "opacity-60")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-text-primary">{r.titulaire_nom}</p>
            <p className="text-xs text-text-secondary">
              {[r.titulaire_telephone, !r.membre && t("bus.sansCompte"), formatDateHeure(r.date_reservation)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Contact telephone={r.titulaire_telephone} />
            <BadgeStatut statut={r.statut} />
          </div>
        </div>
        {r.passagers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.passagers.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-bg-secondary px-2.5 py-1 text-xs text-text-primary">
                {p.nom}
                <span className="flex items-center gap-0.5 font-bold text-accent-primary">
                  <Bus className="h-3 w-3" />
                  {p.bus_numero}
                </span>
              </span>
            ))}
          </div>
        )}
        {payant && !r.annulee && (
          <p className="text-sm text-text-secondary">
            {t("bus.aPayer")} <b className="tabular-nums text-text-primary">{formatMontant(r.montant_du)}</b> · {t("bus.paye")}{" "}
            <b className="tabular-nums text-text-primary">{formatMontant(r.montant_paye)}</b>
            {reste > 0 && (
              <>
                {" "}
                · {t("bus.reste")} <b className="tabular-nums text-status-error">{formatMontant(reste)}</b>
              </>
            )}
          </p>
        )}
        {r.paiements.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {r.paiements.map((p) => (
              <LignePaiement key={p.id} paiement={p} />
            ))}
          </div>
        )}
        {(r.acceptee_par_nom || r.creee_par_nom) && (
          <p className="text-[11px] text-text-secondary">
            {r.acceptee_par_nom && t("bus.accepteePar", { nom: r.acceptee_par_nom })}
            {r.creee_par_nom && r.creee_par_nom !== r.titulaire_nom && ` · ${t("bus.saisiePar", { nom: r.creee_par_nom })}`}
          </p>
        )}
        {!r.annulee && (
          <div className="flex flex-wrap gap-2">
            {!r.acceptee && (
              <Button
                size="sm"
                chargement={occupe === `acc${r.id}`}
                onClick={() => action(`acc${r.id}`, () => api.post(`/evenements/reservations-bus/${r.id}/accepter/`), t("bus.reservationAcceptee"))}
              >
                <Check className="h-4 w-4" /> {t("bus.accepter")}
              </Button>
            )}
            {payant && reste > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setPaiementPour(r)}>
                <Banknote className="h-4 w-4" /> {t("bus.enregistrerPaiement")}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-status-error" onClick={() => setAAnnuler(r)}>
              <X className="h-4 w-4" /> {t("bus.annulerLaReservation")}
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <AppShell large>
      <Link to="/espace-bus" className="mb-5 flex w-fit items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("nav.espaceBus")}
      </Link>
      <EnTete
        surTitre={t("bus.gestionTitre")}
        titre={evenement.titre}
        sousTitre={`${formatDateHeure(evenement.date)}${evenement.lieu ? ` · ${evenement.lieu}` : ""}`}
      />
      {/* Boutons sous le titre (ils passent à la ligne sur téléphone). */}
      <div className="-mt-3 mb-6 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setAjout(true)}>
          <UserPlus className="h-4 w-4" /> {t("bus.ajouterReservation")}
        </Button>
        <Button variant="outline" size="sm" onClick={imprimer}>
          <Printer className="h-4 w-4" /> {t("bus.imprimer")}
        </Button>
        <Button variant="outline" size="sm" onClick={exporterCSV}>
          <Download className="h-4 w-4" /> {t("adminEv.exporter")}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icone={Users} label={t("bus.placesReservees")} valeur={`${totaux.places_occupees}/${totaux.capacite}`} />
        {payant && (
          <>
            <Stat icone={CheckCircle2} label={t("bus.encaisse")} valeur={formatMontant(totaux.montant_paye)} aide={t("bus.surMontant", { montant: formatMontant(totaux.montant_du) })} />
            <Stat icone={Clock} ton="or" label={t("bus.aVerifier")} valeur={formatMontant(totaux.montant_a_verifier)} />
            <Stat icone={Wallet} ton="rouge" label={t("bus.resteAEncaisser")} valeur={formatMontant(totaux.reste_a_payer)} />
          </>
        )}
      </div>

      {evenement.responsables.length > 0 && (
        <p className="mb-4 text-sm text-text-secondary">
          {t("bus.responsables")} : <span className="font-semibold text-text-primary">{evenement.responsables.map((r) => r.nom).join(", ")}</span>
        </p>
      )}
      {moi && <MesNumeros key={moi.id} responsable={moi} onEnregistre={charger} />}

      <Onglets
        className="mb-5 max-w-lg"
        valeur={onglet}
        onChange={setOnglet}
        options={[
          { id: "traiter", label: t("bus.ongletTraiter"), compteur: aVerifier.length + enAttente.length },
          { id: "reservations", label: t("bus.ongletReservations"), compteur: actives.length },
          { id: "bus", label: t("bus.ongletBus") },
        ]}
      />

      {onglet === "traiter" &&
        (aVerifier.length || enAttente.length ? (
          <div className="flex flex-col gap-6">
            {aVerifier.length > 0 && (
              <section>
                <h2 className="mb-1 font-bold text-text-primary">{t("bus.paiementsAVerifier")}</h2>
                <p className="mb-3 text-sm text-text-secondary">{t("bus.paiementsAVerifierAide")}</p>
                <div className="flex flex-col gap-2">
                  {aVerifier.map(({ p, r }) => (
                    <Card key={p.id} className="flex flex-col gap-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate font-semibold text-text-primary">
                          {r.titulaire_nom} <span className="text-sm font-normal text-text-secondary">· {t("evenements.nbPlaces", { count: r.nb_places })}</span>
                        </p>
                        <Contact telephone={r.titulaire_telephone} />
                      </div>
                      <LignePaiement
                        paiement={p}
                        actions={
                          <span className="flex gap-2">
                            <Button
                              size="sm"
                              chargement={occupe === `val${p.id}`}
                              onClick={() => action(`val${p.id}`, () => api.post(`/evenements/paiements-bus/${p.id}/valider/`), t("bus.paiementValide"))}
                            >
                              <Check className="h-4 w-4" /> {t("bus.valider")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-status-error"
                              chargement={occupe === `ref${p.id}`}
                              onClick={() => action(`ref${p.id}`, () => api.post(`/evenements/paiements-bus/${p.id}/refuser/`), t("bus.paiementRefuse"))}
                            >
                              {t("bus.refuser")}
                            </Button>
                          </span>
                        }
                      />
                    </Card>
                  ))}
                </div>
              </section>
            )}
            {enAttente.length > 0 && (
              <section>
                <h2 className="mb-1 font-bold text-text-primary">{t("bus.reservationsEnAttente")}</h2>
                <p className="mb-3 text-sm text-text-secondary">{t("bus.reservationsEnAttenteAide")}</p>
                <div className="flex flex-col gap-3">{enAttente.map(carteReservation)}</div>
              </section>
            )}
          </div>
        ) : (
          <Vide icone={CheckCircle2} titre={t("bus.toutEstAJour")} />
        ))}

      {onglet === "reservations" && (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("bus.rechercher")} className="ps-9" />
          </div>
          {resultats.length ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{resultats.map(carteReservation)}</div>
          ) : (
            <Vide icone={Users} titre={t("adminEv.aucuneReservation")} />
          )}
        </>
      )}

      {onglet === "bus" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {bus.map((b) => (
            <Card key={b.numero} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 font-bold text-text-primary">
                  <Bus className="h-5 w-5 text-accent-primary" /> {t("evenements.busNumero", { numero: b.numero })}
                </p>
                <span className={cn("text-sm font-semibold tabular-nums", b.passagers.length >= b.places_total ? "text-status-error" : "text-text-secondary")}>
                  {b.passagers.length}/{b.places_total}
                </span>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border-subtle">
                <div
                  className={cn("h-full rounded-full", b.passagers.length / (b.places_total || 1) > 0.85 ? "bg-status-warning" : "bg-accent-primary")}
                  style={{ width: `${Math.min(100, Math.round((b.passagers.length / (b.places_total || 1)) * 100))}%` }}
                />
              </div>
              {b.passagers.length ? (
                <ol className="flex flex-col">
                  {b.passagers.map((p, i) => (
                    <li key={p.id} className={cn("flex items-center gap-2 py-2", i && "border-t border-border-subtle")}>
                      <span className="w-6 shrink-0 text-center text-xs font-bold text-text-secondary">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{p.nom}</p>
                        {!p.est_titulaire && <p className="truncate text-[11px] text-text-secondary">{t("bus.reservePar", { nom: p.titulaire_nom })}</p>}
                      </div>
                      <span className="hidden sm:inline-flex">
                        <BadgeStatut statut={p.statut} />
                      </span>
                      <span
                        className={cn("h-2.5 w-2.5 shrink-0 rounded-full sm:hidden", POINT_STATUT[p.statut])}
                        title={t(`bus.statuts.${p.statut}`)}
                      />
                      {bus.length > 1 && (
                        <Select
                          aria-label={t("bus.changerDeBus")}
                          value={b.numero}
                          disabled={occupe === `bus${p.id}`}
                          onChange={(e) =>
                            action(`bus${p.id}`, () => api.patch(`/evenements/passagers-bus/${p.id}/`, { bus_numero: Number(e.target.value) }), t("bus.passagerDeplace"))
                          }
                          className="h-9 w-20 shrink-0 px-2 text-xs"
                        >
                          {bus.map((x) => (
                            <option key={x.numero} value={x.numero}>
                              {t("bus.busCourt", { numero: x.numero })}
                            </option>
                          ))}
                        </Select>
                      )}
                      {(reservations.find((r) => r.id === p.reservation)?.passagers.length ?? 0) > 1 && (
                        <button
                          type="button"
                          aria-label={t("bus.retirerPassager")}
                          onClick={() => action(`del${p.id}`, () => api.delete(`/evenements/passagers-bus/${p.id}/`), t("bus.passagerRetire"))}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-status-error-bg hover:text-status-error"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-4 text-center text-sm text-text-secondary">{t("bus.busVide")}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {paiementPour && (
        <FormulairePaiement
          ouvert
          onFermer={() => setPaiementPour(null)}
          reservation={paiementPour}
          responsables={evenement.responsables}
          parResponsable
          onFait={() => charger()}
        />
      )}

      <Modal
        ouvert={ajout}
        onFermer={() => setAjout(false)}
        titre={t("bus.ajouterReservation")}
        description={t("bus.ajouterReservationAide")}
        pied={
          <>
            <Button variant="outline" onClick={() => setAjout(false)}>
              {t("commun.annuler")}
            </Button>
            <Button
              onClick={ajouterReservation}
              chargement={occupe === "ajout"}
              disabled={contact.nom.trim().length < 2 || !passagersValides(passagers)}
            >
              {t("bus.reserver", { count: passagers.length })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Champ label={t("bus.nomContact")}>
            {(cid) => (
              <Input
                id={cid}
                value={contact.nom}
                onChange={(e) => {
                  const nom = e.target.value;
                  // Le premier passager reprend le nom du contact tant qu'on ne l'a pas changé.
                  setPassagers((ps) => (ps.length === 1 && (ps[0].nom === "" || ps[0].nom === contact.nom) ? [{ nom }] : ps));
                  setContact((c) => ({ ...c, nom }));
                }}
              />
            )}
          </Champ>
          <Champ label={t("champs.telephone")} optionnel={t("commun.optionnel")}>
            {(cid) => <TelephoneInput id={cid} valeur={contact.telephone} onChange={(telephone) => setContact((c) => ({ ...c, telephone }))} />}
          </Champ>
          <div>
            <p className="mb-2 text-sm font-semibold text-text-primary">{t("bus.quiVoyage")}</p>
            <ListePassagers passagers={passagers} onChange={setPassagers} avecMoi={false} />
          </div>
        </div>
      </Modal>

      <Confirmation
        ouvert={!!aAnnuler}
        onFermer={() => setAAnnuler(null)}
        onConfirmer={() =>
          aAnnuler &&
          action(
            "annul",
            async () => {
              await api.delete(`/evenements/reservations-bus/${aAnnuler.id}/`);
              setAAnnuler(null);
            },
            t("evenements.reservationAnnulee"),
          )
        }
        titre={t("bus.annulerLaReservation")}
        message={t("bus.annulerParResponsable", { nom: aAnnuler?.titulaire_nom })}
        libelleConfirmer={t("bus.annulerLaReservation")}
        chargement={occupe === "annul"}
      />
    </AppShell>
  );
}
