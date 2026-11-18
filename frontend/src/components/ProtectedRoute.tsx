import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

interface Props {
  children: ReactNode;
  rolesAutorises?: string[];
}

/** Protège une route : redirige vers /connexion si non connecté, ou vers / si le rôle ne convient pas. */
export function ProtectedRoute({ children, rolesAutorises }: Props) {
  const { membre, chargement } = useAuth();

  if (chargement) return null;
  if (!membre) return <Navigate to="/connexion" replace />;
  if (
    rolesAutorises &&
    !rolesAutorises.includes(membre.role) &&
    membre.role !== "admin_general"
  ) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
