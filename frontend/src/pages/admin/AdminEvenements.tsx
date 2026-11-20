import { Bus, Calendar, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ChoixResponsables, type ResponsableChoisi } from "@/components/metier/bus/ChoixResponsables";
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
} from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { formatDateHeure, versDatetimeLocal } from "@/lib/utils";


interface Formulaire {
  titre: string;
  description: string;
  lieu: string;
  categorie: CategorieEvenement;
  date: string;
  reservation_bus_active: boolean;
  nb_bus: string;
  places_par_bus: string;
  prix_place: string;
  responsables: ResponsableChoisi[];
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
  prix_place: "",
  responsables: [],
};

export default function AdminEvenements() {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const [periode, setPeriode] = useState<"a_venir" | "passes">("a_venir");
  const [evenements, setEvenements] = useState<Evenement[] | null>(null);
  const [edition, setEdition] = useState<Evenement | "nouveau" | null>(null);
  const [form, setForm] = useState<Formulaire>(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Evenement | null>(null);

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
        prix_place: edition.prix_place ? String(Number(edition.prix_place)) : "",
        responsables: edition.responsables.map((r) => ({ id: r.membre, nom_complet: r.nom, telephone: r.telephone })),
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
      prix_place: form.reservation_bus_active && form.prix_place ? Number(form.prix_place) : null,
      responsables_ids: form.reservation_bus_active ? form.responsables.map((r) => r.id) : [],
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
                    <Button asChild variant="secondary" size="sm">
                      <Link to={`/espace-bus/${ev.id}`}>
                        <ClipboardList className="h-4 w-4" /> {t("bus.gererLesBus")}
                      </Link>
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
              <Champ label={t("bus.prixPlace")} aide={t("bus.prixPlaceAide")}>
                {(id) => <Input id={id} type="number" min={0} inputMode="numeric" value={form.prix_place} onChange={maj("prix_place")} placeholder="0" />}
              </Champ>
              <div />
              <div className="sm:col-span-2">
                <p className="mb-1 text-sm font-semibold text-text-primary">{t("bus.responsablesTitre")}</p>
                <p className="mb-2 text-xs text-text-secondary">{t("bus.responsablesAide")}</p>
                <ChoixResponsables
                  valeur={form.responsables}
                  onChange={(responsables) => setForm((f) => ({ ...f, responsables }))}
                />
              </div>
            </>
          )}
        </div>
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
