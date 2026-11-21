import { Play, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { CarteContenu } from "@/components/metier/Elements";
import { ElementAnime, EnTete, ListeAnimee, Onglets, SqueletteListe, Vide } from "@/components/ui/Divers";
import { Input } from "@/components/ui/Input";
import { Pagination, usePageServeur } from "@/components/ui/Pagination";
import { type CategorieEvenement, type ContenuMedia } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Filtre = "tous" | "audio" | "video" | "texte";

export default function Mediatheque() {
  const { t } = useTranslation();
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState("-date_publication");
  const [params, setParams] = useSearchParams();
  const categorie = (params.get("categorie") ?? "") as CategorieEvenement | "";
  const choisirCategorie = (c: CategorieEvenement | "") =>
    setParams(c ? { categorie: c } : {}, { replace: true });

  // La recherche part 300 ms après la dernière lettre tapée.
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState("");
  useEffect(() => {
    const minuterie = window.setTimeout(() => setRechercheEnvoyee(recherche.trim()), recherche ? 300 : 0);
    return () => window.clearTimeout(minuterie);
  }, [recherche]);

  // 10 contenus par page.
  const url = useMemo(() => {
    const requete = new URLSearchParams({ ordering: tri });
    if (filtre !== "tous") requete.set("type", filtre);
    if (categorie) requete.set("categorie", categorie);
    if (rechercheEnvoyee) requete.set("search", rechercheEnvoyee);
    return `/mediatheque/contenus/?${requete}`;
  }, [filtre, rechercheEnvoyee, tri, categorie]);
  const pages = usePageServeur<ContenuMedia>(url);
  const contenus = pages.elements;

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
              "shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95",
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
        <div ref={pages.ref}>
          <ListeAnimee key={`${filtre}-${tri}-${pages.page}`} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {contenus.map((c) => (
              <ElementAnime key={c.id}>
                <CarteContenu contenu={c} />
              </ElementAnime>
            ))}
          </ListeAnimee>
          <Pagination page={pages.page} nbPages={pages.nbPages} onChange={pages.changer} />
        </div>
      ) : (
        <Vide icone={Play} titre={t("mediatheque.aucunResultat")} message={t("mediatheque.aucunResultatAide")} />
      )}
    </AppShell>
  );
}
