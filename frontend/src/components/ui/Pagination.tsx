import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, type Paginated } from "@/lib/api";
import { cn } from "@/lib/utils";

export const PAR_PAGE = 10;

/** Numéros affichés : 1 … 4 5 6 … 12 */
function numeros(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const autour = [page - 1, page, page + 1].filter((n) => n > 1 && n < total);
  const liste: (number | "…")[] = [1];
  if (autour[0] > 2) liste.push("…");
  liste.push(...autour);
  if (autour[autour.length - 1] < total - 1) liste.push("…");
  liste.push(total);
  return liste;
}

/** Pagination : précédent / numéros / suivant. N'apparaît que s'il y a plus d'une page. */
export function Pagination({
  page,
  nbPages,
  onChange,
  className,
}: {
  page: number;
  nbPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (nbPages <= 1) return null;
  const bouton = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors";
  return (
    <nav aria-label={t("pagination.titre")} className={cn("mt-6 flex flex-wrap items-center justify-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={t("pagination.precedente")}
        className={cn(bouton, "border border-border-subtle text-text-primary hover:bg-bg-secondary disabled:opacity-40")}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </button>
      {numeros(page, nbPages).map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1 text-text-secondary">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(bouton, "relative", n === page ? "text-text-inverse" : "text-text-secondary hover:text-text-primary")}
          >
            {n === page && (
              <motion.span
                layoutId="pagination-active"
                className="absolute inset-0 rounded-full bg-accent-primary shadow"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative tabular-nums">{n}</span>
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= nbPages}
        aria-label={t("pagination.suivante")}
        className={cn(bouton, "border border-border-subtle text-text-primary hover:bg-bg-secondary disabled:opacity-40")}
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </button>
    </nav>
  );
}

/** Remonte en haut de la liste quand on change de page. */
function useDefilerVers<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const defiler = () => {
    const el = ref.current;
    if (!el) return;
    const haut = el.getBoundingClientRect().top + window.scrollY - 90;
    if (haut < window.scrollY) window.scrollTo({ top: haut, behavior: "smooth" });
  };
  return { ref, defiler };
}

/** Pagination d'une liste déjà chargée en entier (10 par page).
 * Revient à la page 1 quand `cle` change (filtre, recherche, onglet…). */
export function usePageLocale<T>(liste: T[] | null, cle: unknown = null, parPage = PAR_PAGE) {
  const [page, setPage] = useState(1);
  const { ref, defiler } = useDefilerVers<HTMLDivElement>();
  const total = liste?.length ?? 0;
  const nbPages = Math.max(1, Math.ceil(total / parPage));
  useEffect(() => {
    setPage(1);
  }, [cle]);
  const pageSure = Math.min(page, nbPages);
  return {
    ref,
    page: pageSure,
    nbPages,
    elements: liste ? liste.slice((pageSure - 1) * parPage, pageSure * parPage) : null,
    changer: (p: number) => {
      setPage(p);
      defiler();
    },
  };
}

/** Pagination par le serveur : charge seulement la page demandée (10 éléments). `url` sans page ni page_size. */
export function usePageServeur<T>(url: string | null, parPage = PAR_PAGE) {
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState<{ elements: T[]; total: number } | null>(null);
  const [version, setVersion] = useState(0);
  const { ref, defiler } = useDefilerVers<HTMLDivElement>();

  useEffect(() => {
    setPage(1);
  }, [url]);

  useEffect(() => {
    if (!url) return;
    let actif = true;
    setDonnees(null);
    const separateur = url.includes("?") ? "&" : "?";
    api
      .get<Paginated<T>>(`${url}${separateur}page=${page}&page_size=${parPage}`)
      .then((res) => actif && setDonnees({ elements: res.data.results, total: res.data.count }))
      .catch(() => actif && setDonnees({ elements: [], total: 0 }));
    return () => {
      actif = false;
    };
  }, [url, page, parPage, version]);

  return {
    ref,
    page,
    nbPages: Math.max(1, Math.ceil((donnees?.total ?? 0) / parPage)),
    total: donnees?.total ?? 0,
    elements: donnees?.elements ?? null,
    changer: (p: number) => {
      setPage(p);
      defiler();
    },
    recharger: () => setVersion((v) => v + 1),
  };
}
