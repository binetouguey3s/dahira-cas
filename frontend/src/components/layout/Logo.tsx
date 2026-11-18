import { useId } from "react";

import { useParametres } from "@/context/ParametresContext";
import { cn } from "@/lib/utils";

/** Logo du Dahira (image envoyée par l'admin, sinon emblème par défaut). */
export function Logo({ taille = 40, className }: { taille?: number; className?: string }) {
  const { parametres } = useParametres();
  // Identifiant unique : plusieurs logos sur la même page ne doivent pas partager leur dégradé.
  const idDegrade = `logo-fond-${useId().replace(/:/g, "")}`;
  if (parametres.logo) {
    return (
      <img
        src={parametres.logo}
        alt={parametres.nom_dahira}
        className={cn("shrink-0 rounded-xl object-contain", className)}
        style={{ width: taille, height: taille }}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={parametres.nom_dahira}
      className={cn("shrink-0", className)}
      style={{ width: taille, height: taille }}
    >
      <defs>
        <linearGradient id={idDegrade} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E7A5D" />
          <stop offset="1" stopColor="#0B3D2E" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${idDegrade})`} />
      {/* Étoile à huit branches, motif traditionnel */}
      <g fill="none" stroke="#D9C89A" strokeWidth="1.8" strokeLinejoin="round">
        <rect x="14" y="14" width="20" height="20" rx="1.5" />
        <rect x="14" y="14" width="20" height="20" rx="1.5" transform="rotate(45 24 24)" />
      </g>
      <path
        d="M27.5 19.2a6 6 0 1 0 0 9.6 4.8 4.8 0 1 1 0-9.6Z"
        fill="#D9C89A"
      />
    </svg>
  );
}
