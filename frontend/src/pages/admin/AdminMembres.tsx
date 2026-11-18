import { motion } from "motion/react";
import { Copy, KeyRound, MessageCircle, Search, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge, CardInteractive } from "@/components/ui/Card";
import { Avatar, ElementAnime, EnTete, ListeAnimee, SqueletteListe, Vide } from "@/components/ui/Divers";
import { Champ, Input, Interrupteur, Select } from "@/components/ui/Input";
import { Confirmation, Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useParametres } from "@/context/ParametresContext";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur, type MembreAdmin, type Paginated, type Role } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const ROLES: Role[] = ["membre", "responsable_finance", "oustaz", "admin_contenus", "admin_general"];

type Formulaire = Pick<MembreAdmin, "nom_complet" | "telephone" | "email" | "profession" | "adresse" | "pays" | "role" | "is_active">;

const VIDE: Formulaire = {
  nom_complet: "",
  telephone: "",
  email: "",
  profession: "",
  adresse: "",
  pays: "Sénégal",
  role: "membre",
  is_active: true,
};

function lienWhatsApp(telephone: string, message: string) {
  return `https://wa.me/${telephone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}

export default function AdminMembres() {
  const { t } = useTranslation();
  const { membre: moi } = useAuth();
  const { parametres } = useParametres();
  const { notifier } = useToast();
  const [params, setParams] = useSearchParams();
  const [membres, setMembres] = useState<MembreAdmin[] | null>(null);
  const [total, setTotal] = useState(0);
  const [suivante, setSuivante] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [role, setRole] = useState<string>("");
  const [actif, setActif] = useState<string>("");
  const [edition, setEdition] = useState<MembreAdmin | "nouveau" | null>(params.get("nouveau") ? "nouveau" : null);
  const [form, setForm] = useState<Formulaire>(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [aReinitialiser, setAReinitialiser] = useState<MembreAdmin | null>(null);
  const [identifiants, setIdentifiants] = useState<{ nom: string; telephone: string; mdp: string } | null>(null);

  const charger = () => {
    const q = new URLSearchParams({ ordering: "-date_inscription" });
    if (recherche.trim()) q.set("search", recherche.trim());
    if (role) q.set("role", role);
    if (actif) q.set("is_active", actif);
    return api.get<Paginated<MembreAdmin>>(`/comptes/membres/?${q}`).then((res) => {
      setMembres(res.data.results);
      setTotal(res.data.count);
      setSuivante(res.data.next);
    });
  };

  useEffect(() => {
    const m = window.setTimeout(() => charger().catch(() => setMembres([])), recherche ? 300 : 0);
    return () => window.clearTimeout(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, role, actif]);

  useEffect(() => {
    if (edition === "nouveau") setForm(VIDE);
    else if (edition)
      setForm({
        nom_complet: edition.nom_complet,
        telephone: edition.telephone,
        email: edition.email,
        profession: edition.profession,
        adresse: edition.adresse,
        pays: edition.pays,
        role: edition.role,
        is_active: edition.is_active,
      });
  }, [edition]);

  const fermer = () => {
    setEdition(null);
    if (params.get("nouveau")) setParams({}, { replace: true });
  };

  const enregistrer = async () => {
    setEnvoi(true);
    const donnees = { ...form, telephone: form.telephone.replace(/\s+/g, "") };
    try {
      if (edition === "nouveau") {
        const { data } = await api.post<MembreAdmin & { mot_de_passe_provisoire: string }>("/comptes/membres/", donnees);
        setIdentifiants({ nom: data.nom_complet, telephone: data.telephone, mdp: data.mot_de_passe_provisoire });
        notifier(t("admin.membreCree"));
      } else if (edition) {
        await api.patch(`/comptes/membres/${edition.id}/`, donnees);
        notifier(t("commun.enregistre"));
      }
      fermer();
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const reinitialiser = async () => {
    if (!aReinitialiser) return;
    setEnvoi(true);
    try {
      const { data } = await api.post<{ mot_de_passe_provisoire: string }>(
        `/comptes/membres/${aReinitialiser.id}/reinitialiser-mot-de-passe/`,
      );
      setIdentifiants({ nom: aReinitialiser.nom_complet, telephone: aReinitialiser.telephone, mdp: data.mot_de_passe_provisoire });
      setAReinitialiser(null);
      setEdition(null);
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const chargerPlus = async () => {
    if (!suivante) return;
    const { data } = await api.get<Paginated<MembreAdmin>>(suivante);
    setMembres((m) => [...(m ?? []), ...data.results]);
    setSuivante(data.next);
  };

  const maj = (c: keyof Formulaire) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [c]: e.target.value }));
  const estMoi = edition !== "nouveau" && edition?.id === moi?.id;
  const messageIdentifiants = identifiants
    ? t("admin.messageIdentifiants", {
        nom: identifiants.nom,
        dahira: parametres.nom_dahira,
        site: window.location.origin,
        telephone: identifiants.telephone,
        mdp: identifiants.mdp,
      })
    : "";

  return (
    <AppShell large>
      <EnTete
        surTitre={t("nav.administration")}
        titre={t("admin.membres")}
        sousTitre={t("admin.membresSousTitre", { count: total })}
        action={
          <Button onClick={() => setEdition("nouveau")}>
            <UserPlus className="h-4 w-4" /> {t("admin.inviter")}
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_200px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("admin.rechercherMembre")} className="ps-11" />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label={t("admin.role")}>
          <option value="">{t("admin.tousRoles")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </Select>
        <Select value={actif} onChange={(e) => setActif(e.target.value)} aria-label={t("admin.statut")}>
          <option value="">{t("admin.tousStatuts")}</option>
          <option value="true">{t("admin.actifs")}</option>
          <option value="false">{t("admin.desactives")}</option>
        </Select>
      </div>

      {membres === null ? (
        <SqueletteListe lignes={5} />
      ) : membres.length ? (
        <>
          <ListeAnimee className="grid gap-3 lg:grid-cols-2">
            {membres.map((m) => (
              <ElementAnime key={m.id}>
                <CardInteractive onClick={() => setEdition(m)} className={`flex items-center gap-3 ${m.is_active ? "" : "opacity-60"}`}>
                  <Avatar nom={m.nom_complet} photo={m.photo} taille={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary">{m.nom_complet}</p>
                    <p className="truncate text-sm text-text-secondary">
                      {m.telephone} · {m.carte_numero}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={m.role === "membre" ? "neutral" : "or"}>{t(`roles.${m.role}`)}</Badge>
                    {!m.is_active && <Badge tone="error">{t("admin.desactive")}</Badge>}
                  </div>
                </CardInteractive>
              </ElementAnime>
            ))}
          </ListeAnimee>
          {suivante && (
            <button onClick={chargerPlus} className="mx-auto mt-6 block rounded-full border border-border-subtle px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-secondary">
              {t("commun.voirPlus")}
            </button>
          )}
        </>
      ) : (
        <Vide icone={Users} titre={t("admin.aucunMembre")} />
      )}

      {/* Fiche membre */}
      <Modal
        ouvert={edition !== null}
        onFermer={fermer}
        large
        titre={edition === "nouveau" ? t("admin.inviter") : t("admin.ficheMembre")}
        description={edition === "nouveau" ? t("admin.inviterDescription") : undefined}
        pied={
          <>
            {edition && edition !== "nouveau" && (
              <Button variant="ghost" className="sm:me-auto" onClick={() => setAReinitialiser(edition)}>
                <KeyRound className="h-4 w-4" /> {t("admin.reinitialiserMdp")}
              </Button>
            )}
            <Button variant="outline" onClick={fermer}>
              {t("commun.annuler")}
            </Button>
            <Button onClick={enregistrer} chargement={envoi} disabled={!form.nom_complet.trim() || !form.telephone.trim()}>
              {edition === "nouveau" ? t("admin.creerCompte") : t("commun.enregistrer")}
            </Button>
          </>
        }
      >
        {edition && edition !== "nouveau" && (
          <div className="mb-5 flex items-center gap-4 rounded-2xl bg-bg-secondary/60 p-4">
            <Avatar nom={edition.nom_complet} photo={edition.photo} taille={56} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-text-primary">{edition.carte_numero}</p>
              <p className="text-text-secondary">
                {t("profil.membreDepuis")} {formatDate(edition.date_inscription)}
              </p>
              <p className="text-text-secondary">
                {t("admin.derniereConnexion")} {edition.last_login ? formatDate(edition.last_login) : t("admin.jamais")} ·{" "}
                {t("admin.cotisationsPayees", { count: edition.nb_cotisations_payees })}
              </p>
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label={t("champs.nomComplet")} className="sm:col-span-2">
            {(id) => <Input id={id} value={form.nom_complet} onChange={maj("nom_complet")} required />}
          </Champ>
          <Champ label={t("champs.telephone")}>
            {(id) => <Input id={id} type="tel" value={form.telephone} onChange={maj("telephone")} required />}
          </Champ>
          <Champ label={t("champs.email")} optionnel={t("commun.optionnel")}>
            {(id) => <Input id={id} type="email" value={form.email} onChange={maj("email")} />}
          </Champ>
          <Champ label={t("champs.profession")} optionnel={t("commun.optionnel")}>
            {(id) => <Input id={id} value={form.profession} onChange={maj("profession")} />}
          </Champ>
          <Champ label={t("champs.adresse")} optionnel={t("commun.optionnel")}>
            {(id) => <Input id={id} value={form.adresse} onChange={maj("adresse")} />}
          </Champ>
          <Champ label={t("champs.pays")}>
            {(id) => <Input id={id} value={form.pays} onChange={maj("pays")} />}
          </Champ>
          <Champ label={t("admin.role")} aide={estMoi ? t("admin.propreRole") : t(`admin.rolesAide.${form.role}`)} className="sm:col-span-2">
            {(id) => (
              <Select id={id} value={form.role} onChange={maj("role")} disabled={estMoi}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Champ>
          {edition !== "nouveau" && !estMoi && (
            <div className="sm:col-span-2">
              <Interrupteur
                coche={form.is_active}
                onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                label={t("admin.compteActif")}
                description={t("admin.compteActifAide")}
              />
            </div>
          )}
        </div>
      </Modal>

      <Confirmation
        ouvert={!!aReinitialiser}
        onFermer={() => setAReinitialiser(null)}
        onConfirmer={reinitialiser}
        titre={t("admin.reinitialiserMdp")}
        message={t("admin.reinitialiserMessage", { nom: aReinitialiser?.nom_complet })}
        libelleConfirmer={t("admin.reinitialiser")}
        danger={false}
        chargement={envoi}
      />

      {/* Identifiants à transmettre */}
      <Modal
        ouvert={!!identifiants}
        onFermer={() => setIdentifiants(null)}
        titre={t("admin.identifiantsTitre")}
        description={t("admin.identifiantsAide")}
        pied={
          <>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(messageIdentifiants);
                notifier(t("commun.copie"));
              }}
            >
              <Copy className="h-4 w-4" /> {t("commun.copier")}
            </Button>
            {identifiants && (
              <Button asChild>
                <a href={lienWhatsApp(identifiants.telephone, messageIdentifiants)} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> {t("admin.envoyerWhatsApp")}
                </a>
              </Button>
            )}
          </>
        }
      >
        {identifiants && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-accent-soft p-5 text-center">
            <p className="text-sm text-text-secondary">{identifiants.nom}</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{identifiants.telephone}</p>
            <p className="mt-3 select-all font-mono text-3xl font-bold tracking-wider text-accent-primary">{identifiants.mdp}</p>
          </motion.div>
        )}
      </Modal>
    </AppShell>
  );
}
