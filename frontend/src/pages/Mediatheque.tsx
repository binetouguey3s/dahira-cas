import { Play, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { CarteContenu } from "@/components/metier/Elements";
import { ElementAnime, EnTete, ListeAnimee, Onglets, SqueletteListe, Vide } from "@/components/ui/Divers";
import { Input } from "@/components/ui/Input";
import { api, type CategorieEvenement, type ContenuMedia, type Paginated } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Filtre = "tous" | "audio" | "video" | "texte";

export default function Mediatheque() {
  const { t } = useTranslation();
  const [contenus, setContenus] = useState<ContenuMedia[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState("-date_publication");
  const [suivante, setSuivante] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const categorie = (params.get("categorie") ?? "") as CategorieEvenement | "";
  const choisirCategorie = (c: CategorieEvenement | "") =>
    setParams(c ? { categorie: c } : {}, { replace: true });

  useEffect(() => {
    const requete = new URLSearchParams({ ordering: tri });
    if (filtre !== "tous") requete.set("type", filtre);
    if (categorie) requete.set("categorie", categorie);
    if (recherche.trim()) requete.set("search", recherche.trim());
    setContenus(null);
    const minuterie = window.setTimeout(() => {
      api
        .get<Paginated<ContenuMedia>>(`/mediatheque/contenus/?${requete}`)
        .then((res) => {
          setContenus(res.data.results);
          setSuivante(res.data.next);
        })
        .catch(() => setContenus([]));
    }, recherche ? 300 : 0);
    return () => window.clearTimeout(minuterie);
  }, [filtre, recherche, tri, categorie]);

  const chargerPlus = async () => {
    if (!suivante) return;
    const { data } = await api.get<Paginated<ContenuMedia>>(suivante);
    setContenus((c) => [...(c ?? []), ...data.results]);
    setSuivante(data.next);
  };

  return (
    <AppShell>
      <EnTete surTitre={t("mediatheque.surTitre")} titre={t("nav.mediatheque")} sousTitre={t("mediatheque.sousTitre")} />

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={t("mediatheque.rechercher")}
            className="ps-11"
            type="search"
          />
        </div>
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value)}
          aria-label={t("commun.trier")}
          className="select-chevron h-12 cursor-pointer appearance-none rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated bg-[length:16px] bg-[position:right_14px_center] bg-no-repeat pe-10 ps-4 text-sm text-text-primary rtl:bg-[position:left_14px_center]"
        >
          <option value="-date_publication">{t("mediatheque.triRecents")}</option>
          <option value="-nb_likes">{t("mediatheque.triPopulaires")}</option>
          <option value="titre">{t("mediatheque.triAlphabetique")}</option>
        </select>
      </div>

      <Onglets
        className="mb-6"
        valeur={filtre}
        onChange={setFiltre}
        options={[
          { id: "tous", label: t("mediatheque.tous") },
          { id: "audio", label: t("mediatheque.types.audio") },
          { id: "video", label: t("mediatheque.types.video") },
          { id: "texte", label: t("mediatheque.types.texte") },
        ]}
      />

      {/* Catégories (Magal, Gamou, Nisfou Shabaan…) : bande qui défile sur mobile */}
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {(["", ...CATEGORIES] as (CategorieEvenement | "")[]).map((c) => (
          <button
            key={c || "toutes"}
            type="button"
            onClick={() => choisirCategorie(c)}
            aria-pressed={categorie === c}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              categorie === c
                ? "border-accent-primary bg-accent-primary text-white"
                : "border-border-subtle bg-bg-elevated text-text-primary hover:border-accent-primary/40",
            )}
          >
            {c ? t(`evenements.categories.${c}`) : t("mediatheque.toutesCategories")}
          </button>
        ))}
      </div>

      {contenus === null ? (
        <SqueletteListe lignes={4} />
      ) : contenus.length ? (
        <>
          <ListeAnimee key={`${filtre}-${tri}`} className="grid gap-3 md:grid-cols-2">
            {contenus.map((c) => (
              <ElementAnime key={c.id}>
                <CarteContenu contenu={c} />
              </ElementAnime>
            ))}
          </ListeAnimee>
          {suivante && (
            <button
              onClick={chargerPlus}
              className="mx-auto mt-6 block rounded-full border border-border-subtle px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-secondary"
            >
              {t("commun.voirPlus")}
            </button>
          )}
        </>
      ) : (
        <Vide icone={Play} titre={t("mediatheque.aucunResultat")} message={t("mediatheque.aucunResultatAide")} />
      )}
    </AppShell>
  );
}
