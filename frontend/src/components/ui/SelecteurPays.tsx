import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { drapeau, listePays, nomPays, simplifier, type CodePays } from "@/lib/pays";
import { cn } from "@/lib/utils";

export function Drapeau({ code, className }: { code: string; className?: string }) {
  return (
    <img
      src={drapeau(code)}
      alt=""
      loading="lazy"
      className={cn("h-4 w-6 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]", className)}
    />
  );
}

/** Liste de tous les pays avec recherche (nom, code ou indicatif), utilisée par le choix du pays et du téléphone. */
function ListePays({
  valeur,
  avecIndicatif,
  onChoisir,
}: {
  valeur?: string;
  avecIndicatif?: boolean;
  onChoisir: (code: CodePays) => void;
}) {
  const { t, i18n } = useTranslation();
  const [recherche, setRecherche] = useState("");
  const liste = listePays(i18n.language);
  const filtre = useMemo(() => {
    const q = simplifier(recherche.replace(/^\+/, ""));
    if (!q) return liste;
    return liste.filter((p) => p.recherche.includes(q) || p.indicatif.slice(1).startsWith(q));
  }, [liste, recherche]);
  const actifRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="flex max-h-[min(420px,70dvh)] w-[min(340px,calc(100vw-32px))] flex-col">
      <div className="relative border-b border-border-subtle p-2">
        <Search className="pointer-events-none absolute start-5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          autoFocus
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtre[0]) {
              e.preventDefault();
              onChoisir(filtre[0].code);
            }
          }}
          placeholder={t("pays.rechercher")}
          aria-label={t("pays.rechercher")}
          className="h-10 w-full rounded-[var(--radius-md)] bg-bg-secondary pe-3 ps-9 text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
        />
      </div>
      <ul role="listbox" className="flex-1 overflow-y-auto overscroll-contain p-1">
        {filtre.length === 0 && <li className="px-3 py-6 text-center text-sm text-text-secondary">{t("pays.aucun")}</li>}
        {filtre.map((p) => {
          const choisi = p.code === valeur;
          return (
            <li key={p.code} role="option" aria-selected={choisi}>
              <button
                type="button"
                ref={choisi ? actifRef : undefined}
                onClick={() => onChoisir(p.code)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-start text-sm transition-colors hover:bg-bg-secondary focus:bg-bg-secondary focus:outline-none",
                  choisi && "bg-accent-soft font-semibold text-accent-primary",
                )}
              >
                <Drapeau code={p.code} />
                <span className="min-w-0 flex-1 truncate">{p.nom}</span>
                {avecIndicatif && <span className="text-xs tabular-nums text-text-secondary" dir="ltr">{p.indicatif}</span>}
                {choisi && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PopoverPays({
  valeur,
  avecIndicatif,
  onChoisir,
  children,
}: {
  valeur?: string;
  avecIndicatif?: boolean;
  onChoisir: (code: CodePays) => void;
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <Popover.Root open={ouvert} onOpenChange={setOuvert}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-[80] overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated shadow-[0_24px_60px_-20px_rgba(8,32,25,0.45)] data-[state=open]:animate-[apparition_160ms_ease-out]"
        >
          <ListePays
            valeur={valeur}
            avecIndicatif={avecIndicatif}
            onChoisir={(code) => {
              onChoisir(code);
              setOuvert(false);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Choix du pays : drapeau + nom, avec recherche parmi tous les pays du monde. */
export function SelecteurPays({ id, valeur, onChange }: { id?: string; valeur: string; onChange: (code: CodePays) => void }) {
  const { t, i18n } = useTranslation();
  return (
    <PopoverPays valeur={valeur} onChoisir={onChange}>
      <button
        id={id}
        type="button"
        className="flex h-12 w-full items-center gap-3 rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated px-4 text-start text-sm text-text-primary transition-[border-color,box-shadow] duration-200 hover:border-border-default focus:border-accent-primary focus:outline-none focus:ring-4 focus:ring-accent-primary/15"
      >
        {valeur ? <Drapeau code={valeur} /> : null}
        <span className={cn("min-w-0 flex-1 truncate", !valeur && "text-text-secondary/70")}>
          {valeur ? nomPays(valeur, i18n.language) : t("pays.choisir")}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
      </button>
    </PopoverPays>
  );
}
