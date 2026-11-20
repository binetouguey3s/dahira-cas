import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { CarteEvenement } from "@/components/metier/Elements";
import { ElementAnime, EnTete, ListeAnimee, Onglets, SqueletteListe, Vide } from "@/components/ui/Divers";
import { CATEGORIES } from "@/lib/categories";
import { api, type CategorieEvenement, type Evenement, type Paginated } from "@/lib/api";
import { locale } from "@/lib/utils";

const CATEGORIES_FILTRE: (CategorieEvenement | "toutes")[] = ["toutes", ...CATEGORIES];

export default function Evenements() {
  const { t } = useTranslation();
  const [periode, setPeriode] = useState<"a_venir" | "passes">("a_venir");
  const [categorie, setCategorie] = useState<CategorieEvenement | "toutes">("toutes");
  const [evenements, setEvenements] = useState<Evenement[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ periode });
    if (periode === "a_venir") params.set("ordering", "date");
    if (categorie !== "toutes") params.set("categorie", categorie);
    setEvenements(null);
    api
      .get<Paginated<Evenement>>(`/evenements/evenements/?${params}`)
      .then((res) => setEvenements(res.data.results))
      .catch(() => setEvenements([]));
  }, [periode, categorie]);

  // Regroupe par mois pour une lecture plus agréable.
  const parMois = (evenements ?? []).reduce<Record<string, Evenement[]>>((acc, ev) => {
    const cle = new Date(ev.date).toLocaleDateString(locale(), { month: "long", year: "numeric" });
    (acc[cle] ??= []).push(ev);
    return acc;
  }, {});

  return (
    <AppShell>
      <EnTete surTitre={t("evenements.surTitre")} titre={t("nav.evenements")} sousTitre={t("evenements.sousTitre")} />

      <Onglets
        className="mb-4 max-w-sm"
        valeur={periode}
        onChange={setPeriode}
        options={[
          { id: "a_venir", label: t("evenements.aVenir") },
          { id: "passes", label: t("evenements.passes") },
        ]}
      />

      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {CATEGORIES_FILTRE.map((c) => (
          <button
            key={c}
            onClick={() => setCategorie(c)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              categorie === c
                ? "border-accent-secondary bg-accent-secondary/15 text-accent-secondary-text"
                : "border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
          >
            {c === "toutes" ? t("evenements.toutesCategories") : t(`evenements.categories.${c}`)}
          </button>
        ))}
      </div>

      {evenements === null ? (
        <SqueletteListe lignes={3} />
      ) : evenements.length ? (
        <div className="flex flex-col gap-8">
          {Object.entries(parMois).map(([mois, liste]) => (
            <section key={mois}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-text-secondary">{mois}</h2>
              <ListeAnimee className="flex flex-col gap-3">
                {liste.map((ev) => (
                  <ElementAnime key={ev.id}>
                    <CarteEvenement evenement={ev} />
                  </ElementAnime>
                ))}
              </ListeAnimee>
            </section>
          ))}
        </div>
      ) : (
        <Vide
          icone={Calendar}
          titre={periode === "a_venir" ? t("evenements.aucunAVenir") : t("evenements.aucunPasse")}
        />
      )}
    </AppShell>
  );
}
