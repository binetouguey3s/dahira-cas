import { useParametres } from "@/context/ParametresContext";
import { cn } from "@/lib/utils";

/** Logo officiel du Dahira (celui envoyé dans les paramètres du site, sinon le logo fourni). */
export const LOGO_PAR_DEFAUT = "/logo.jpg";

export function Logo({ taille = 40, className }: { taille?: number; className?: string }) {
  const { parametres } = useParametres();
  return (
    <img
      src={parametres.logo || LOGO_PAR_DEFAUT}
      alt={parametres.nom_dahira}
      className={cn("shrink-0 rounded-xl bg-white object-contain", className)}
      style={{ width: taille, height: taille }}
    />
  );
}
