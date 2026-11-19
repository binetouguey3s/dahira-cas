import { motion, type Variants } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { cn, initiales } from "@/lib/utils";

/* ---------- Animations communes ---------- */

export const conteneurCascade: Variants = {
  cache: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const elementCascade: Variants = {
  cache: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 } },
};

/** Liste dont les éléments apparaissent les uns après les autres. */
export function ListeAnimee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible" className={className}>
      {children}
    </motion.div>
  );
}

export function ElementAnime({ children, className }: { children: ReactNode; className?: string }) {
  // min-w-0 : dans une grille, l'élément peut rétrécir et les textes longs sont tronqués au lieu de déborder.
  return (
    <motion.div variants={elementCascade} className={cn("min-w-0", className)}>
      {children}
    </motion.div>
  );
}

/* ---------- En-tête de page ---------- */

export function EnTete({
  titre,
  sousTitre,
  action,
  surTitre,
}: {
  titre: ReactNode;
  sousTitre?: ReactNode;
  action?: ReactNode;
  surTitre?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {surTitre && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-secondary-text">{surTitre}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">{titre}</h1>
        {sousTitre && <p className="mt-1 max-w-2xl text-sm text-text-secondary">{sousTitre}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/* ---------- Avatar ---------- */

/** Photo de profil ; si l'image ne se charge pas, les initiales s'affichent à la place. */
export function Avatar({
  nom,
  photo,
  taille = 40,
  className,
}: {
  nom: string;
  photo?: string | null;
  taille?: number;
  className?: string;
}) {
  const [echec, setEchec] = useState(false);
  useEffect(() => {
    setEchec(false);
  }, [photo]);
  return photo && !echec ? (
    <img
      src={photo}
      alt={nom}
      onError={() => setEchec(true)}
      width={taille}
      height={taille}
      loading="lazy"
      className={cn("shrink-0 rounded-full object-cover ring-2 ring-bg-elevated", className)}
      style={{ width: taille, height: taille }}
    />
  ) : (
    <div
      aria-label={nom}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-[#0B3D2E] font-bold text-white ring-2 ring-bg-elevated",
        className,
      )}
      style={{ width: taille, height: taille, fontSize: Math.max(12, taille * 0.36) }}
    >
      {initiales(nom) || "?"}
    </div>
  );
}

/* ---------- États ---------- */

export function Squelette({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-md)] bg-bg-secondary", className)} />;
}

export function SqueletteListe({ lignes = 3 }: { lignes?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border-subtle p-4">
          <Squelette className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Squelette className="h-4 w-2/3" />
            <Squelette className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Vide({
  icone: Icone,
  titre,
  message,
  action,
}: {
  icone: LucideIcon;
  titre: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border-subtle px-6 py-12 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
        <Icone className="h-7 w-7" />
      </div>
      <p className="font-semibold text-text-primary">{titre}</p>
      {message && <p className="max-w-sm text-sm text-text-secondary">{message}</p>}
      {action}
    </motion.div>
  );
}

/* ---------- Onglets segmentés ---------- */

export function Onglets<T extends string>({
  valeur,
  onChange,
  options,
  className,
}: {
  valeur: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode; compteur?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto rounded-full bg-bg-secondary p-1 no-scrollbar", className)}>
      {options.map((o) => {
        const actif = o.id === valeur;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={actif}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              actif ? "text-text-inverse" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {actif && (
              <motion.span
                layoutId={`onglet-actif-${options.map((x) => x.id).join("-")}`}
                className="absolute inset-0 rounded-full bg-accent-primary shadow"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1.5">
              {o.label}
              {o.compteur !== undefined && o.compteur > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px]",
                    actif ? "bg-white/25" : "bg-accent-primary/15 text-accent-primary",
                  )}
                >
                  {o.compteur}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Statistique ---------- */

export function Stat({
  icone: Icone,
  label,
  valeur,
  aide,
  ton = "vert",
}: {
  icone: LucideIcon;
  label: ReactNode;
  valeur: ReactNode;
  aide?: ReactNode;
  ton?: "vert" | "or" | "rouge";
}) {
  const tons = {
    vert: "bg-accent-soft text-accent-primary",
    or: "bg-accent-secondary/15 text-accent-secondary-text",
    rouge: "bg-status-error-bg text-status-error",
  };
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated p-4">
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", tons[ton])}>
        <Icone className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold tabular-nums text-text-primary">{valeur}</p>
      <p className="text-sm text-text-secondary">{label}</p>
      {aide && <p className="mt-1 text-xs text-text-secondary/80">{aide}</p>}
    </div>
  );
}
