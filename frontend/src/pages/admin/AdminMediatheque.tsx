import { motion } from "motion/react";
import { Archive, Download, FileUp, Heart, Link2, Pencil, Play, Plus, Search, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Archives, BoutonArchives } from "@/components/metier/Archives";
import { ICONES_CONTENU } from "@/components/metier/Elements";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { ElementAnime, EnTete, ListeAnimee, Onglets, SqueletteListe, Vide } from "@/components/ui/Divers";
import { Champ, Input, Interrupteur, Select, Textarea } from "@/components/ui/Input";
import { Confirmation, Modal } from "@/components/ui/Modal";
import { Pagination, usePageLocale } from "@/components/ui/Pagination";
import { useParametres } from "@/context/ParametresContext";
import { useToast } from "@/context/ToastContext";
import { CATEGORIES } from "@/lib/categories";
import { api, messageErreur, toutesLesPages, type CategorieEvenement, type ContenuMedia, type Evenement, type TypeContenu } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Formulaire {
  titre: string;
  type: TypeContenu;
  auteur: string;
  description: string;
  url_externe: string;
  evenement: string;
  categorie: CategorieEvenement | "";
  categorie_autre: string;
  source: "fichier" | "lien";
  sur_biographie: boolean;
}

const ACCEPT: Record<TypeContenu, string> = { audio: "audio/*", video: "video/*", texte: "" };

export default function AdminMediatheque() {
  const { t } = useTranslation();
  const { parametres } = useParametres();
  const { notifier } = useToast();
  const [contenus, setContenus] = useState<ContenuMedia[] | null>(null);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [filtre, setFiltre] = useState<"tous" | TypeContenu>("tous");
  const [recherche, setRecherche] = useState("");
  const [edition, setEdition] = useState<ContenuMedia | "nouveau" | null>(null);
  const [form, setForm] = useState<Formulaire>({ titre: "", type: "audio", auteur: "", description: "", url_externe: "", evenement: "", categorie: "", categorie_autre: "", source: "fichier", sur_biographie: false });
  const [fichier, setFichier] = useState<File | null>(null);
  const [progression, setProgression] = useState<number | null>(null);
  const [aSupprimer, setASupprimer] = useState<ContenuMedia | null>(null);
  const [archives, setArchives] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);

  const charger = () =>
    toutesLesPages<ContenuMedia>("/mediatheque/contenus/?ordering=-date_publication")
      .then(setContenus)
      .catch(() => setContenus([]));

  useEffect(() => {
    charger();
    toutesLesPages<Evenement>("/evenements/evenements/?ordering=-date").then(setEvenements).catch(() => undefined);
  }, []);

  useEffect(() => {
    setFichier(null);
    setProgression(null);
    if (edition === "nouveau")
      setForm({ titre: "", type: "audio", auteur: parametres.nom_guide, description: "", url_externe: "", evenement: "", categorie: "", categorie_autre: "", source: "fichier", sur_biographie: false });
    else if (edition)
      setForm({
        titre: edition.titre,
        type: edition.type,
        auteur: edition.auteur,
        description: edition.description,
        url_externe: edition.url_externe,
        evenement: edition.evenement ? String(edition.evenement) : "",
        categorie: edition.categorie ?? "",
        categorie_autre: edition.categorie_autre ?? "",
        source: edition.url_externe && !edition.fichier ? "lien" : "fichier",
        sur_biographie: !!edition.sur_biographie,
      });
  }, [edition, parametres.nom_guide]);

  const maj = (c: keyof Formulaire) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [c]: e.target.value }));

  const enregistrer = async () => {
    setEnvoi(true);
    const donnees = new FormData();
    donnees.append("titre", form.titre.trim());
    donnees.append("type", form.type);
    donnees.append("auteur", form.auteur.trim());
    donnees.append("description", form.description.trim());
    donnees.append("evenement", form.evenement);
    donnees.append("categorie", form.categorie);
    donnees.append("categorie_autre", form.categorie === "autre" ? form.categorie_autre.trim() : "");
    donnees.append("sur_biographie", form.sur_biographie ? "true" : "false");
    donnees.append("url_externe", form.type !== "texte" && form.source === "lien" ? form.url_externe.trim() : "");
    if (form.type !== "texte" && form.source === "fichier" && fichier) donnees.append("fichier", fichier);
    try {
      const config = {
        onUploadProgress: (e: { loaded: number; total?: number }) => e.total && setProgression(Math.round((e.loaded / e.total) * 100)),
      };
      if (edition === "nouveau") await api.post("/mediatheque/contenus/", donnees, config);
      else if (edition) await api.patch(`/mediatheque/contenus/${edition.id}/`, donnees, config);
      notifier(edition === "nouveau" ? t("adminMedia.publie") : t("commun.enregistre"));
      setEdition(null);
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
      setProgression(null);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setEnvoi(true);
    try {
      await api.delete(`/mediatheque/contenus/${aSupprimer.id}/`);
      setContenus((c) => c?.filter((x) => x.id !== aSupprimer.id) ?? null);
      notifier(t("archives.archive"));
      setASupprimer(null);
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const visibles = (contenus ?? []).filter(
    (c) =>
      (filtre === "tous" || c.type === filtre) &&
      (!recherche.trim() || `${c.titre} ${c.auteur}`.toLowerCase().includes(recherche.trim().toLowerCase())),
  );
  const pages = usePageLocale(visibles, `${filtre}|${recherche}`);
  const fichierExistant = edition && edition !== "nouveau" && edition.fichier;
  const valide =
    form.titre.trim() &&
    form.auteur.trim() &&
    (form.type === "texte"
      ? form.description.trim()
      : form.source === "lien"
        ? form.url_externe.trim()
        : fichier || fichierExistant);

  return (
    <AppShell large>
      <EnTete
        surTitre={t("nav.administration")}
        titre={t("admin.mediatheque")}
        sousTitre={t("adminMedia.sousTitre")}
        action={
          <>
            <BoutonArchives onClick={() => setArchives(true)} />
            <Button onClick={() => setEdition("nouveau")}>
              <Plus className="h-4 w-4" /> {t("adminMedia.publier")}
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("mediatheque.rechercher")} className="ps-11" />
        </div>
        <Onglets
          className="md:w-[420px]"
          valeur={filtre}
          onChange={setFiltre}
          options={[
            { id: "tous", label: t("mediatheque.tous") },
            { id: "audio", label: t("mediatheque.types.audio") },
            { id: "video", label: t("mediatheque.types.video") },
            { id: "texte", label: t("mediatheque.types.texte") },
          ]}
        />
      </div>

      {contenus === null ? (
        <SqueletteListe lignes={4} />
      ) : visibles.length ? (
        <div ref={pages.ref}>
        <ListeAnimee key={`${filtre}-${pages.page}`} className="flex flex-col gap-2">
          {(pages.elements ?? []).map((c) => {
            const Icone = ICONES_CONTENU[c.type];
            return (
              <ElementAnime key={c.id}>
                <Card className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
                    <Icone className="h-5 w-5" />
                  </div>
                  <Link to={`/mediatheque/${c.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary hover:underline">{c.titre}</p>
                    <p className="truncate text-sm text-text-secondary">
                      <span className="inline-flex flex-wrap items-center gap-x-2">
                        {c.auteur} · {formatDate(c.date_publication)}
                        <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {c.nb_likes}</span>
                        <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {c.nb_telechargements}</span>
                      </span>
                    </p>
                  </Link>
                  <Badge tone="neutral" className="hidden sm:inline-flex">
                    {t(`mediatheque.types.${c.type}`)}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => setEdition(c)} aria-label={t("commun.modifier")}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-status-error" onClick={() => setASupprimer(c)} aria-label={t("archives.archiver")}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </Card>
              </ElementAnime>
            );
          })}
        </ListeAnimee>
        <Pagination page={pages.page} nbPages={pages.nbPages} onChange={pages.changer} />
        </div>
      ) : (
        <Vide
          icone={Play}
          titre={t("mediatheque.aucunContenu")}
          action={
            <Button onClick={() => setEdition("nouveau")}>
              <Plus className="h-4 w-4" /> {t("adminMedia.publier")}
            </Button>
          }
        />
      )}

      <Modal
        ouvert={edition !== null}
        onFermer={() => !envoi && setEdition(null)}
        large
        titre={edition === "nouveau" ? t("adminMedia.publier") : t("adminMedia.modifier")}
        pied={
          <>
            <Button variant="outline" onClick={() => setEdition(null)} disabled={envoi}>
              {t("commun.annuler")}
            </Button>
            <Button onClick={enregistrer} chargement={envoi} disabled={!valide}>
              {edition === "nouveau" ? t("adminMedia.publier") : t("commun.enregistrer")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {(["audio", "video", "texte"] as TypeContenu[]).map((ty) => {
              const Icone = ICONES_CONTENU[ty];
              return (
                <button
                  key={ty}
                  onClick={() => {
                    setForm((f) => ({ ...f, type: ty }));
                    setFichier(null);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-sm font-semibold transition ${
                    form.type === ty ? "border-accent-primary bg-accent-soft text-accent-primary" : "border-border-subtle text-text-primary"
                  }`}
                >
                  <Icone className="h-5 w-5" /> {t(`mediatheque.types.${ty}`)}
                </button>
              );
            })}
          </div>

          <Champ label={t("adminMedia.titre")}>{(id) => <Input id={id} value={form.titre} onChange={maj("titre")} />}</Champ>
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label={t("adminMedia.auteur")}>{(id) => <Input id={id} value={form.auteur} onChange={maj("auteur")} />}</Champ>
            <Champ label={t("adminMedia.evenementLie")} optionnel={t("commun.optionnel")}>
              {(id) => (
                <Select
                  id={id}
                  value={form.evenement}
                  onChange={(e) => {
                    const choisi = evenements.find((ev) => String(ev.id) === e.target.value);
                    // Un média lié à un événement reprend sa catégorie (modifiable ensuite).
                    setForm((f) => ({ ...f, evenement: e.target.value, categorie: choisi && !f.categorie ? choisi.categorie : f.categorie }));
                  }}
                >
                  <option value="">—</option>
                  {evenements.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.titre} ({formatDate(ev.date, { month: "short", year: "numeric" })})
                    </option>
                  ))}
                </Select>
              )}
            </Champ>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label={t("adminMedia.categorie")} optionnel={t("commun.optionnel")}>
              {(id) => (
                <Select id={id} value={form.categorie} onChange={maj("categorie")}>
                  <option value="">—</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`evenements.categories.${c}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Champ>
            {form.categorie === "autre" && (
              <Champ label={t("adminMedia.categoriePrecision")}>
                {(id) => (
                  <Input id={id} value={form.categorie_autre} onChange={maj("categorie_autre")} maxLength={80} placeholder={t("adminMedia.categoriePrecisionExemple")} autoFocus />
                )}
              </Champ>
            )}
          </div>

          {form.type !== "texte" && (
            <div className="flex flex-col gap-3">
              <Onglets
                valeur={form.source}
                onChange={(s) => setForm((f) => ({ ...f, source: s }))}
                options={[
                  { id: "fichier", label: <><FileUp className="h-4 w-4" /> {t("adminMedia.envoyerFichier")}</> },
                  { id: "lien", label: <><Link2 className="h-4 w-4" /> {t("adminMedia.lien")}</> },
                ]}
              />
              {form.source === "fichier" ? (
                <button
                  type="button"
                  onClick={() => champFichier.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) setFichier(f);
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border-subtle px-4 py-8 text-center transition hover:border-accent-primary hover:bg-accent-soft/40"
                >
                  <UploadCloud className="h-8 w-8 text-accent-primary" />
                  <span className="text-sm font-semibold text-text-primary">
                    {fichier ? fichier.name : fichierExistant ? t("adminMedia.remplacerFichier") : t("adminMedia.choisirFichier")}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {fichier ? `${(fichier.size / 1024 / 1024).toFixed(1)} Mo` : t("adminMedia.tailleMax")}
                  </span>
                  <input
                    ref={champFichier}
                    type="file"
                    accept={ACCEPT[form.type]}
                    className="hidden"
                    onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                  />
                </button>
              ) : (
                <Champ label={t("adminMedia.lienExterne")} aide={t("adminMedia.lienAide")}>
                  {(id) => <Input id={id} type="url" value={form.url_externe} onChange={maj("url_externe")} placeholder="https://youtu.be/…" />}
                </Champ>
              )}
              {progression !== null && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-text-secondary">
                    <span>{t("adminMedia.envoiEnCours")}</span>
                    <span className="tabular-nums">{progression}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
                    <motion.div className="h-full bg-accent-primary" animate={{ width: `${progression}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <Champ
            label={form.type === "texte" ? t("adminMedia.texte") : t("adminMedia.description")}
            optionnel={form.type === "texte" ? undefined : t("commun.optionnel")}
            aide={t("adminMedia.traductionAuto")}
          >
            {(id) => <Textarea id={id} rows={form.type === "texte" ? 10 : 4} value={form.description} onChange={maj("description")} />}
          </Champ>
          <Interrupteur
            coche={form.sur_biographie}
            onChange={(v) => setForm((f) => ({ ...f, sur_biographie: v }))}
            label={t("adminMedia.surBiographie")}
            description={t("adminMedia.surBiographieAide")}
          />
        </div>
      </Modal>

      <Confirmation
        ouvert={!!aSupprimer}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        titre={t("adminMedia.supprimerTitre")}
        message={t("adminMedia.supprimerMessage", { titre: aSupprimer?.titre })}
        libelleConfirmer={t("archives.archiver")}
        chargement={envoi}
      />

      <Archives<ContenuMedia>
        ouvert={archives}
        onFermer={() => setArchives(false)}
        base="/mediatheque/contenus/"
        onChange={charger}
        rendu={(c) => (
          <>
            <p className="truncate font-semibold text-text-primary">{c.titre}</p>
            <p className="text-xs text-text-secondary">
              {t(`mediatheque.types.${c.type}`)} · {c.auteur} · {formatDate(c.date_publication)}
            </p>
          </>
        )}
      />
    </AppShell>
  );
}
