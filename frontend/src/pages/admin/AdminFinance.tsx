import { Archive, Banknote, CalendarPlus, CheckCircle2, Download, MessageCircle, Plus, Search, UserPlus, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { Archives, BoutonArchives } from "@/components/metier/Archives";
import { RappelsCotisation } from "@/components/metier/RappelsCotisation";
import { TelephoneInput } from "@/components/ui/TelephoneInput";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Avatar, ElementAnime, EnTete, ListeAnimee, Onglets, SqueletteListe, Stat, Vide } from "@/components/ui/Divers";
import { Champ, Input, Select } from "@/components/ui/Input";
import { Confirmation, Modal } from "@/components/ui/Modal";
import { Pagination, usePageLocale } from "@/components/ui/Pagination";
import { useParametres } from "@/context/ParametresContext";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur, toutesLesPages, type Cotisation, type MembreResume } from "@/lib/api";
import { TONS_STATUT } from "@/lib/statuts";
import { formatMois, formatMontant, locale } from "@/lib/utils";

type Moyen = "wave" | "orange_money" | "autre";

export default function AdminFinance() {
  const { t } = useTranslation();
  const { parametres } = useParametres();
  const { notifier } = useToast();
  const maintenant = new Date();
  const [mois, setMois] = useState(maintenant.getMonth() + 1);
  const [annee, setAnnee] = useState(maintenant.getFullYear());
  const [statut, setStatut] = useState<"tous" | "paye" | "impaye">("tous");
  const [recherche, setRecherche] = useState("");
  const [cotisations, setCotisations] = useState<Cotisation[] | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [aEncaisser, setAEncaisser] = useState<Cotisation | null>(null);
  const [moyen, setMoyen] = useState<Moyen>("wave");
  const [reference, setReference] = useState("");
  const [generation, setGeneration] = useState(false);
  const [montantGeneration, setMontantGeneration] = useState(parametres.montant_cotisation);
  const [ajout, setAjout] = useState(false);
  const [annuaire, setAnnuaire] = useState<MembreResume[]>([]);
  const [choixMembre, setChoixMembre] = useState<number | "">("");
  const [rechercheMembre, setRechercheMembre] = useState("");
  const [montantAjout, setMontantAjout] = useState(parametres.montant_cotisation);
  const [aSupprimer, setASupprimer] = useState<Cotisation | null>(null);
  const [archives, setArchives] = useState(false);
  const [nouveauSansCompte, setNouveauSansCompte] = useState(false);
  const [sansCompte, setSansCompte] = useState({ nom: "", telephone: "", adresse: "" });
  const [export_, setExport] = useState(false);

  const charger = () => {
    setCotisations(null);
    return toutesLesPages<Cotisation>(`/finances/cotisations/?mois=${mois}&annee=${annee}&ordering=membre__nom_complet`)
      .then(setCotisations)
      .catch(() => setCotisations([]));
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mois, annee]);

  useEffect(() => {
    setMontantGeneration(parametres.montant_cotisation);
    setMontantAjout(parametres.montant_cotisation);
  }, [parametres.montant_cotisation]);

  useEffect(() => {
    if (ajout && !annuaire.length) api.get<MembreResume[]>("/comptes/annuaire/").then((r) => setAnnuaire(r.data)).catch(() => undefined);
  }, [ajout, annuaire.length]);

  const liste = useMemo(() => cotisations ?? [], [cotisations]);
  const visibles = useMemo(
    () =>
      liste.filter(
        (c) =>
          (statut === "tous" || (statut === "paye" ? c.statut === "paye" : c.statut !== "paye")) &&
          (!recherche.trim() ||
            `${c.membre_nom} ${c.membre_telephone}`.toLowerCase().includes(recherche.trim().toLowerCase())),
      ),
    [liste, statut, recherche],
  );
  const encaisse = liste.filter((c) => c.statut === "paye").reduce((s, c) => s + Number(c.montant), 0);
  const attendu = liste.reduce((s, c) => s + Number(c.montant), 0);
  const nbPayees = liste.filter((c) => c.statut === "paye").length;

  const encaisser = async () => {
    if (!aEncaisser) return;
    setEnvoi(true);
    try {
      await api.patch(`/finances/cotisations/${aEncaisser.id}/`, {
        statut: "paye",
        moyen_paiement: moyen,
        reference_transaction: reference.trim(),
      });
      notifier(t("finance.encaissee", { nom: aEncaisser.membre_nom }));
      setAEncaisser(null);
      setReference("");
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const annulerPaiement = async (c: Cotisation) => {
    try {
      await api.patch(`/finances/cotisations/${c.id}/`, { statut: "non_paye", moyen_paiement: "", reference_transaction: "" });
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    }
  };

  const generer = async () => {
    setEnvoi(true);
    try {
      const { data } = await api.post<{ creees: number; existantes: number }>("/finances/cotisations/generer/", {
        mois,
        annee,
        montant: montantGeneration,
      });
      notifier(t("finance.generees", { count: data.creees }));
      setGeneration(false);
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const ajouter = async () => {
    if (!choixMembre) return;
    setEnvoi(true);
    try {
      await api.post("/finances/cotisations/", { membre: choixMembre, mois, annee, montant: montantAjout });
      notifier(t("commun.enregistre"));
      setAjout(false);
      setChoixMembre("");
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("finance.dejaExistante")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  /** Fichier Excel de l'année affichée : tableau des membres × mois et détail des paiements. */
  const exporterExcel = async () => {
    setExport(true);
    try {
      const { data } = await api.get<Blob>(`/finances/export/?annee=${annee}`, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(data);
      a.download = `cotisations-${annee}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      notifier(t("finance.exportFait", { annee }));
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setExport(false);
    }
  };

  const ajouterSansCompte = async () => {
    setEnvoi(true);
    try {
      await api.post("/finances/membres-sans-compte/", {
        nom_complet: sansCompte.nom.trim(),
        telephone: sansCompte.telephone,
        adresse: sansCompte.adresse.trim(),
      });
      notifier(t("finance.sansCompteAjoute", { nom: sansCompte.nom.trim() }));
      setNouveauSansCompte(false);
      setSansCompte({ nom: "", telephone: "", adresse: "" });
      setAnnuaire([]);
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setEnvoi(true);
    try {
      await api.delete(`/finances/cotisations/${aSupprimer.id}/`);
      notifier(t("archives.archive"));
      setASupprimer(null);
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const pages = usePageLocale(visibles, `${mois}-${annee}-${statut}-${recherche}`);

  const rappel = (c: Cotisation) =>
    `https://wa.me/${c.membre_telephone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
      t("finance.messageRappel", {
        nom: c.membre_nom.split(" ")[0],
        mois: formatMois(c.mois, c.annee),
        montant: formatMontant(c.montant),
        dahira: parametres.nom_dahira,
      }),
    )}`;

  const annuaireFiltre = annuaire.filter((m) =>
    `${m.nom_complet} ${m.telephone} ${m.carte_numero}`.toLowerCase().includes(rechercheMembre.toLowerCase()),
  );

  return (
    <AppShell large>
      <EnTete
        surTitre={t("nav.administration")}
        titre={t("admin.finance")}
        sousTitre={t("finance.sousTitre")}
        action={
          <>
            <BoutonArchives onClick={() => setArchives(true)} />
            <Button variant="outline" onClick={exporterExcel} chargement={export_}>
              <Download className="h-4 w-4" /> {t("finance.exporterExcel")}
            </Button>
            <Button variant="outline" onClick={() => setNouveauSansCompte(true)}>
              <UserPlus className="h-4 w-4" /> {t("finance.membreSansCompte")}
            </Button>
            <Button variant="outline" onClick={() => setAjout(true)}>
              <Plus className="h-4 w-4" /> {t("finance.ajouter")}
            </Button>
            <Button onClick={() => setGeneration(true)}>
              <CalendarPlus className="h-4 w-4" /> {t("finance.generer")}
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Select value={mois} onChange={(e) => setMois(Number(e.target.value))} className="w-auto min-w-40 capitalize" aria-label={t("finance.mois")}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m} className="capitalize">
              {new Date(2000, m - 1).toLocaleDateString(locale(), { month: "long" })}
            </option>
          ))}
        </Select>
        <Select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="w-auto min-w-28" aria-label={t("finance.annee")}>
          {Array.from({ length: 6 }, (_, i) => maintenant.getFullYear() + 1 - i).map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icone={Wallet} label={t("finance.encaisse")} valeur={formatMontant(encaisse)} />
        <Stat icone={Banknote} ton="or" label={t("finance.attendu")} valeur={formatMontant(attendu)} />
        <Stat icone={CheckCircle2} label={t("finance.payees")} valeur={`${nbPayees}/${liste.length}`} />
        <Stat
          icone={Banknote}
          ton={liste.length - nbPayees ? "rouge" : "vert"}
          label={t("finance.taux")}
          valeur={`${liste.length ? Math.round((nbPayees / liste.length) * 100) : 0}%`}
        />
      </div>

      <RappelsCotisation />

      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("admin.rechercherMembre")} className="ps-11" />
        </div>
        <Onglets
          className="md:w-96"
          valeur={statut}
          onChange={setStatut}
          options={[
            { id: "tous", label: t("finance.toutes") },
            { id: "impaye", label: t("finance.impayees"), compteur: liste.length - nbPayees },
            { id: "paye", label: t("finance.payees") },
          ]}
        />
      </div>

      {cotisations === null ? (
        <SqueletteListe lignes={5} />
      ) : visibles.length ? (
        <div ref={pages.ref}>
        <ListeAnimee key={`${mois}-${annee}-${statut}-${pages.page}`} className="flex flex-col gap-2">
          {(pages.elements ?? []).map((c) => (
            <ElementAnime key={c.id}>
              <Card className="flex flex-wrap items-center gap-3">
                <Avatar nom={c.membre_nom} taille={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-2 font-semibold text-text-primary">
                    <span className="truncate">{c.membre_nom}</span>
                    {c.membre_sans_compte && <Badge className="shrink-0 text-[10px]">{t("finance.sansCompte")}</Badge>}
                  </p>
                  <p className="truncate text-sm text-text-secondary">
                    {formatMontant(c.montant)}
                    {c.moyen_paiement && ` · ${t(`cotisations.moyens.${c.moyen_paiement}`)}`}
                    {c.reference_transaction && ` · ${c.reference_transaction}`}
                  </p>
                </div>
                <Badge tone={TONS_STATUT[c.statut]}>{t(`cotisations.statuts.${c.statut}`)}</Badge>
                <div className="flex w-full gap-2 sm:w-auto">
                  {c.statut === "paye" ? (
                    <Button variant="ghost" size="sm" onClick={() => annulerPaiement(c)}>
                      {t("finance.annulerPaiement")}
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => setAEncaisser(c)} className="flex-1 sm:flex-none">
                        {t("finance.encaisser")}
                      </Button>
                      {c.membre_telephone && (
                        <Button asChild variant="secondary" size="sm" title={t("finance.rappeler")}>
                          <a href={rappel(c)} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="text-status-error" onClick={() => setASupprimer(c)} aria-label={t("archives.archiver")}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </ElementAnime>
          ))}
        </ListeAnimee>
        <Pagination page={pages.page} nbPages={pages.nbPages} onChange={pages.changer} />
        </div>
      ) : (
        <Vide
          icone={Wallet}
          titre={liste.length ? t("finance.aucunResultat") : t("finance.aucuneCeMois")}
          message={liste.length ? undefined : t("finance.aucuneCeMoisAide")}
          action={
            !liste.length && (
              <Button onClick={() => setGeneration(true)}>
                <CalendarPlus className="h-4 w-4" /> {t("finance.generer")}
              </Button>
            )
          }
        />
      )}

      {/* Encaisser */}
      <Modal
        ouvert={!!aEncaisser}
        onFermer={() => setAEncaisser(null)}
        titre={t("finance.encaisserTitre")}
        description={aEncaisser ? `${aEncaisser.membre_nom} · ${formatMois(aEncaisser.mois, aEncaisser.annee)} · ${formatMontant(aEncaisser.montant)}` : undefined}
        pied={
          <>
            <Button variant="outline" onClick={() => setAEncaisser(null)}>
              {t("commun.annuler")}
            </Button>
            <Button onClick={encaisser} chargement={envoi}>
              <CheckCircle2 className="h-4 w-4" /> {t("finance.confirmerPaiement")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {(["wave", "orange_money", "autre"] as Moyen[]).map((m) => (
              <button
                key={m}
                onClick={() => setMoyen(m)}
                className={`rounded-2xl border-2 px-2 py-3 text-sm font-semibold transition ${
                  moyen === m ? "border-accent-primary bg-accent-soft text-accent-primary" : "border-border-subtle text-text-primary"
                }`}
              >
                {t(`cotisations.moyens.${m}`)}
              </button>
            ))}
          </div>
          <Champ label={t("finance.reference")} optionnel={t("commun.optionnel")} aide={t("finance.referenceAide")}>
            {(id) => <Input id={id} value={reference} onChange={(e) => setReference(e.target.value)} />}
          </Champ>
        </div>
      </Modal>

      {/* Générer le mois */}
      <Modal
        ouvert={generation}
        onFermer={() => setGeneration(false)}
        titre={t("finance.genererTitre", { mois: formatMois(mois, annee) })}
        description={t("finance.genererAide")}
        pied={
          <>
            <Button variant="outline" onClick={() => setGeneration(false)}>
              {t("commun.annuler")}
            </Button>
            <Button onClick={generer} chargement={envoi} disabled={!Number(montantGeneration)}>
              <CalendarPlus className="h-4 w-4" /> {t("finance.generer")}
            </Button>
          </>
        }
      >
        <Champ label={t("finance.montantParMembre")}>
          {(id) => <Input id={id} type="number" min={1} value={montantGeneration} onChange={(e) => setMontantGeneration(e.target.value)} />}
        </Champ>
      </Modal>

      {/* Ajouter pour un membre */}
      <Modal
        ouvert={ajout}
        onFermer={() => setAjout(false)}
        titre={t("finance.ajouterTitre", { mois: formatMois(mois, annee) })}
        pied={
          <>
            <Button variant="outline" onClick={() => setAjout(false)}>
              {t("commun.annuler")}
            </Button>
            <Button onClick={ajouter} chargement={envoi} disabled={!choixMembre}>
              {t("commun.enregistrer")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input type="search" value={rechercheMembre} onChange={(e) => setRechercheMembre(e.target.value)} placeholder={t("admin.rechercherMembre")} />
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-2xl border border-border-subtle p-1">
            {annuaireFiltre.slice(0, 50).map((m) => (
              <button
                key={m.id}
                onClick={() => setChoixMembre(m.id)}
                className={`flex items-center gap-3 rounded-xl p-2 text-start transition ${
                  choixMembre === m.id ? "bg-accent-soft" : "hover:bg-bg-secondary"
                }`}
              >
                <Avatar nom={m.nom_complet} photo={m.photo} taille={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">{m.nom_complet}</span>
                  <span className="block truncate text-xs text-text-secondary">
                    {[m.telephone, m.sans_compte && t("finance.sansCompte")].filter(Boolean).join(" · ") || m.carte_numero}
                  </span>
                </span>
                {choixMembre === m.id && <CheckCircle2 className="h-5 w-5 text-accent-primary" />}
              </button>
            ))}
          </div>
          <Champ label={t("finance.montant")}>
            {(id) => <Input id={id} type="number" min={1} value={montantAjout} onChange={(e) => setMontantAjout(e.target.value)} />}
          </Champ>
        </div>
      </Modal>

      <Confirmation
        ouvert={!!aSupprimer}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        titre={t("finance.supprimerTitre")}
        message={t("finance.supprimerMessage", { nom: aSupprimer?.membre_nom })}
        libelleConfirmer={t("archives.archiver")}
        chargement={envoi}
      />

      <Modal
        ouvert={nouveauSansCompte}
        onFermer={() => setNouveauSansCompte(false)}
        titre={t("finance.membreSansCompte")}
        description={t("finance.membreSansCompteAide")}
        pied={
          <>
            <Button variant="outline" onClick={() => setNouveauSansCompte(false)}>
              {t("commun.annuler")}
            </Button>
            <Button onClick={ajouterSansCompte} chargement={envoi} disabled={sansCompte.nom.trim().length < 2}>
              {t("finance.ajouterMembre")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Champ label={t("champs.nomComplet")}>
            {(id) => <Input id={id} value={sansCompte.nom} onChange={(e) => setSansCompte((s) => ({ ...s, nom: e.target.value }))} />}
          </Champ>
          <Champ label={t("champs.telephone")} optionnel={t("commun.optionnel")} aide={t("finance.telephoneSansCompteAide")}>
            {(id) => <TelephoneInput id={id} valeur={sansCompte.telephone} onChange={(telephone) => setSansCompte((s) => ({ ...s, telephone }))} />}
          </Champ>
          <Champ label={t("champs.adresse")} optionnel={t("commun.optionnel")}>
            {(id) => <Input id={id} value={sansCompte.adresse} onChange={(e) => setSansCompte((s) => ({ ...s, adresse: e.target.value }))} />}
          </Champ>
        </div>
      </Modal>

      <Archives<Cotisation>
        ouvert={archives}
        onFermer={() => setArchives(false)}
        base="/finances/cotisations/"
        onChange={charger}
        rendu={(c) => (
          <>
            <p className="truncate font-semibold text-text-primary">{c.membre_nom}</p>
            <p className="text-xs capitalize text-text-secondary">
              {formatMois(c.mois, c.annee)} · {formatMontant(c.montant)} · {t(`cotisations.statuts.${c.statut}`)}
            </p>
          </>
        )}
      />
    </AppShell>
  );
}
