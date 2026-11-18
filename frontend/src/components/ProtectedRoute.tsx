import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/api";
import { aAcces } from "@/lib/navigation";

import { Logo } from "./layout/Logo";

export function EcranChargement() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-primary">
      <Logo taille={56} className="animate-pulse" />
    </div>
  );
}

/** Protège une route : connexion obligatoire, et éventuellement un rôle précis. */
export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { membre, chargement } = useAuth();
  const location = useLocation();

  if (chargement) return <EcranChargement />;
  if (!membre) return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />;
  if (!aAcces(membre, roles)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
