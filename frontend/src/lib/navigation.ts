import {
  Banknote,
  BookOpen,
  Calendar,
  CreditCard,
  HelpCircle,
  Home,
  LayoutDashboard,
  type LucideIcon,
  Play,
  Settings,
  User,
  Users,
  Wallet,
} from "lucide-react";

import type { Membre, Role } from "@/lib/api";

export interface LienNav {
  to: string;
  icone: LucideIcon;
  labelKey: string;
  /** Réservé aux membres connectés. */
  connecte?: boolean;
  /** Réservé à ces rôles (l'Admin général et les super-admins ont toujours accès). */
  roles?: Role[];
}

export const ROLES_ADMIN: Role[] = ["responsable_finance", "oustaz", "admin_contenus", "admin_general"];

export const LIENS_PRINCIPAUX: LienNav[] = [
  { to: "/", icone: Home, labelKey: "nav.accueil" },
  { to: "/biographie", icone: BookOpen, labelKey: "nav.biographie" },
  { to: "/mediatheque", icone: Play, labelKey: "nav.mediatheque" },
  { to: "/evenements", icone: Calendar, labelKey: "nav.evenements" },
  { to: "/questions-reponses", icone: HelpCircle, labelKey: "nav.qa", connecte: true },
];

export const LIENS_ESPACE: LienNav[] = [
  { to: "/cotisations", icone: Wallet, labelKey: "nav.cotisations", connecte: true },
  { to: "/carte", icone: CreditCard, labelKey: "nav.carte", connecte: true },
  { to: "/profil", icone: User, labelKey: "nav.profil", connecte: true },
];

export const LIENS_ADMIN: LienNav[] = [
  { to: "/admin", icone: LayoutDashboard, labelKey: "nav.admin", roles: ROLES_ADMIN },
  { to: "/admin/membres", icone: Users, labelKey: "admin.membres", roles: ["admin_general"] },
  { to: "/admin/finance", icone: Banknote, labelKey: "admin.finance", roles: ["responsable_finance"] },
  { to: "/admin/mediatheque", icone: Play, labelKey: "admin.mediatheque", roles: ["oustaz", "admin_contenus"] },
  { to: "/admin/evenements", icone: Calendar, labelKey: "admin.evenements", roles: ["admin_contenus"] },
  { to: "/admin/oustaz", icone: HelpCircle, labelKey: "admin.questions", roles: ["oustaz"] },
  { to: "/admin/site", icone: Settings, labelKey: "admin.site", roles: ["oustaz", "admin_contenus"] },
];

export function estAdminGeneral(membre: Membre | null) {
  return !!membre && (membre.is_staff || membre.role === "admin_general");
}

export function aAcces(membre: Membre | null, roles?: Role[]) {
  if (!roles) return true;
  if (!membre) return false;
  return estAdminGeneral(membre) || roles.includes(membre.role);
}

export function liensVisibles(liens: LienNav[], membre: Membre | null) {
  return liens.filter((l) => (!l.connecte || !!membre) && aAcces(membre, l.roles));
}
