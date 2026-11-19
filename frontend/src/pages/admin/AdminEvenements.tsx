import { Bus, Calendar, Download, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PaveDate } from "@/components/metier/Elements";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { ElementAnime, EnTete, ListeAnimee, Onglets, SqueletteListe, Vide } from "@/components/ui/Divers";
import { Champ, Input, Interrupteur, Select, Textarea } from "@/components/ui/Input";
import { Confirmation, Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import {
  api,
  messageErreur,
  toutesLesPages,
  type CategorieEvenement,
  type Evenement,
  type ReservationBus,
} from "@/lib/api";
import { formatDateHeure, versDatetimeLocal } from "@/lib/utils";

const CATEGORIES: CategorieEvenement[] = ["magal", "gamou", "dahira", "causerie", "nisfou_shabaan", "leylatul_khadr", "autre"];

interface Formulaire {
  titre: string;
  description: string;
  lieu: string;
  categorie: CategorieEvenement;
  date: string;
  reservation_bus_active: boolean;
  nb_bus: string;
  places_par_bus: string;
}

const VIDE: Formulaire = {
  titre: "",
  description: "",
  lieu: "",
  categorie: "dahira",
  date: "",
  reservation_bus_active: false,
  nb_bus: "1",
  places_par_bus: "60",
};

function exporterCSV(evenement: Evenement, reservations: ReservationBus[]) {
  const lignes = [
    ["Bus", "Nom", "Téléphone", "Places", "Réservé le"],
    ...reservations.map((r) => [r.bus_numero, r.membre_nom, r.membre_telephone, r.nb_places, new Date(r.date_reservation).toLocaleString()]),
  ];
  const csv = "﻿" + lignes.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `reservations-${evenement.titre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  a.click();
}

export default function AdminEvenements() {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const [periode, setPeriode] = useState<"a_venir" | "passes">("a_venir");
  const [evenements, setEvenements] = useState<Evenement[] | null>(null);
  const [edition, setEdition] = useState<Evenement | "nouveau" | null>(null);
  const [form, setForm] = useState<Formulaire>(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Evenement | null>(null);
  const [listeResa, setListeResa] = useState<{ ev: Evenement; resas: ReservationBus[] | null } | null>(null);

  const charger = () => {
    setEvenements(null);
    return toutesLesPages<Evenement>(`/evenements/evenements/?periode=${periode}${periode === "a_venir" ? "&ordering=date" : ""}`)
      .then(setEvenements)
      .catch(() => setEvenements([]));
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode]);

  useEffect(() => {
    if (edition === "nouveau") setForm(VIDE);
    else if (edition)
      setForm({
        titre: edition.titre,
        description: edition.description,
        lieu: edition.lieu,
        categorie: edition.categorie,
        date: versDatetimeLocal(edition.date),
        reservation_bus_active: edition.reservation_bus_active,
        nb_bus: String(edition.nb_bus ?? 1),
        places_par_bus: String(edition.places_par_bus ?? ""),
      });
  }, [edition]);

  const maj = (c: keyof Formulaire) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [c]: e.target.value }));

  const enregistrer = async () => {
    setEnvoi(true);
    const donnees = {
      titre: form.titre.trim(),
      description: form.description.trim(),
      lieu: form.lieu.trim(),
      categorie: form.categorie,
      date: new Date(form.date).toISOString(),
      reservation_bus_active: form.reservation_bus_active,
      nb_bus: form.reservation_bus_active ? Number(form.nb_bus) || 1 : null,
      places_par_bus: form.reservation_bus_active && form.places_par_bus ? Number(form.places_par_bus) : null,
    };
    try {
      if (edition === "nouveau") await api.post("/evenements/evenements/", donnees);
      else if (edition) await api.patch(`/evenements/evenements/${edition.id}/`, donnees);
      notifier(edition === "nouveau" ? t("adminEv.cree") : t("commun.enregistre"));
      setEdition(null);
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
      await api.delete(`/evenements/evenements/${aSupprimer.id}/`);
      notifier(t("commun.supprime"));
      setASupprimer(null);
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const ouvrirReservations = async (ev: Evenement) => {
    setListeResa({ ev, resas: null });
    try {
      const { data } = await api.get<ReservationBus[]>(`/evenements/evenements/${ev.id}/reservations/`);
      setListeResa({ ev, resas: data });
    } catch {
      setListeResa({ ev, resas: [] });
    }
  };

  const parBus = (listeResa?.resas ?? []).reduce<Record<number, ReservationBus[]>>((acc, r) => {
    (acc[r.bus_numero] ??= []).push(r);
    return acc;
  }, {});

  return (
    <AppShell large>
      <EnTete
        surTitre={t("nav.administration")}
        titre={t("admin.evenements")}
        sousTitre={t("adminEv.sousTitre")}
        action={
          <Button onClick={() => setEdition("nouveau")}>
            <Plus className="h-4 w-4" /> {t("adminEv.nouveau")}
          </Button>
        }
      />

      <Onglets
        className="mb-6 max-w-sm"
        valeur={periode}
        onChange={setPeriode}
        options={[
          { id: "a_venir", label: t("evenements.aVenir") },
          { id: "passes", label: t("evenements.passes") },
        ]}
      />

      {evenements === null ? (
        <SqueletteListe />
      ) : evenements.length ? (
        <ListeAnimee key={periode} className="flex flex-col gap-3">
          {evenements.map((ev) => (
            <ElementAnime key={ev.id}>
              <Card className="flex flex-wrap items-center gap-4">
                <PaveDate date={ev.date} passe={periode === "passes"} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-2">
                    <Badge tone="or">{t(`evenements.categories.${ev.categorie}`)}</Badge>
                    {ev.reservation_bus_active && (
                      <Badge tone="success">
                        <Bus className="h-3 w-3" /> {t("adminEv.reserves", { count: ev.nb_reservations })}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate font-semibold text-text-primary">{ev.titre}</p>
                  <p className="truncate text-sm text-text-secondary first-letter:uppercase">
                    {formatDateHeure(ev.date)}
                    {ev.lieu && ` · ${ev.lieu}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  {ev.reservation_bus_active && (
                    <Button variant="secondary" size="sm" onClick={() => ouvrirReservations(ev)}>
                      <Users className="h-4 w-4" /> {t("adminEv.liste")}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setEdition(ev)} aria-label={t("commun.modifier")}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-status-error" onClick={() => setASupprimer(ev)} aria-label={t("commun.supprimer")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </ElementAnime>
          ))}
        </ListeAnimee>
      ) : (
        <Vide
          icone={Calendar}
          titre={periode === "a_venir" ? t("evenements.aucunAVenir") : t("evenements.aucunPasse")}
          action={
            periode === "a_venir" && (
              <Button onClick={() => setEdition("nouveau")}>
                <Plus className="h-4 w-4" /> {t("adminEv.nouveau")}
              </Button>
            )
          }
        />
      )}

      <Modal
        ouvert={edition !== null}
        onFermer={() => setEdition(null)}
        large
        titre={edition === "nouveau" ? t("adminEv.nouveau") : t("adminEv.modifier")}
        pied={
          <>
            <Button variant="outline" onClick={() => setEdition(null)}>
              {t("commun.annuler")}
            </Button>
            <Button onClick={enregistrer} chargement={envoi} disabled={!form.titre.trim() || !form.date}>
              {edition === "nouveau" ? t("adminEv.creer") : t("commun.enregistrer")}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label={t("adminEv.titre")} className="sm:col-span-2">
            {(id) => <Input id={id} value={form.titre} onChange={maj("titre")} placeholder="Grand Magal de Touba" />}
          </Champ>
          <Champ label={t("evenements.date")}>
            {(id) => <Input id={id} type="datetime-local" value={form.date} onChange={maj("date")} />}
          </Champ>
          <Champ label={t("evenements.categorie")}>
            {(id) => (
              <Select id={id} value={form.categorie} onChange={maj("categorie")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`evenements.categories.${c}`)}
                  </option>
                ))}
              </Select>
            )}
          </Champ>
          <Champ label={t("evenements.lieu")} className="sm:col-span-2">
            {(id) => <Input id={id} value={form.lieu} onChange={maj("lieu")} placeholder="Touba" />}
          </Champ>
          <Champ label={t("evenements.description")} className="sm:col-span-2" aide={t("adminMedia.traductionAuto")}>
            {(id) => <Textarea id={id} rows={4} value={form.description} onChange={maj("description")} />}
          </Champ>
          <div className="sm:col-span-2">
            <Interrupteur
              coche={form.reservation_bus_active}
              onChange={(v) => setForm((f) => ({ ...f, reservation_bus_active: v }))}
              label={t("admin.activerReservationBus")}
              description={t("adminEv.busAide")}
            />
          </div>
          {form.reservation_bus_active && (
            <>
              <Champ label={t("adminEv.nbBus")}>
                {(id) => <Input id={id} type="number" min={1} max={50} value={form.nb_bus} onChange={maj("nb_bus")} />}
              </Champ>
              <Champ label={t("adminEv.placesParBus")} aide={t("adminEv.placesAide")}>
                {(id) => <Input id={id} type="number" min={1} value={form.places_par_bus} onChange={maj("places_par_bus")} />}
              </Champ>
            </>
          )}
        </div>
      </Modal>

      <Modal
        ouvert={!!listeResa}
        onFermer={() => setListeResa(null)}
        large
        titre={t("adminEv.listeTitre")}
        description={listeResa?.ev.titre}
        pied={
          listeResa?.resas?.length ? (
            <Button variant="outline" onClick={() => listeResa.resas && exporterCSV(listeResa.ev, listeResa.resas)}>
              <Download className="h-4 w-4" /> {t("adminEv.exporter")}
            </Button>
          ) : undefined
        }
      >
        {listeResa?.resas === null ? (
          <SqueletteListe />
        ) : Object.keys(parBus).length ? (
          <div className="flex flex-col gap-5">
            {Object.entries(parBus).map(([numero, resas]) => (
              <div key={numero}>
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Bus className="h-4 w-4 text-accent-primary" /> {t("evenements.busNumero", { numero })} ·{" "}
                  {t("evenements.nbPlaces", { count: resas.reduce((s, r) => s + r.nb_places, 0) })}
                </p>
                <div className="overflow-hidden rounded-2xl border border-border-subtle">
                  {resas.map((r, i) => (
                    <div key={r.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${i ? "border-t border-border-subtle" : ""}`}>
                      <span className="font-medium text-text-primary">{r.membre_nom}</span>
                      <span className="text-text-secondary">
                        {r.membre_telephone} · {r.nb_places}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Vide icone={Bus} titre={t("adminEv.aucuneReservation")} />
        )}
      </Modal>

      <Confirmation
        ouvert={!!aSupprimer}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        titre={t("adminEv.supprimerTitre")}
        message={t("adminEv.supprimerMessage", { titre: aSupprimer?.titre })}
        libelleConfirmer={t("commun.supprimer")}
        chargement={envoi}
      />
    </AppShell>
  );
}
