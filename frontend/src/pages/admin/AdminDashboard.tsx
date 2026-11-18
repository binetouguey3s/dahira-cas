import { AlertTriangle, Banknote, Calendar, ChevronRight, HelpCircle, Play, Settings, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { CardInteractive } from "@/components/ui/Card";
import { ElementAnime, EnTete, ListeAnimee, Squelette, Stat } from "@/components/ui/Divers";
import { useAuth } from "@/context/AuthContext";
import { api, type Role, type Statistiques } from "@/lib/api";
import { aAcces } from "@/lib/navigation";
import { formatMontant } from "@/lib/utils";

const SECTIONS: { to: string; icone: typeof Users; titre: string; aide: string; roles: Role[] }[] = [
  { to: "/admin/membres", icone: Users, titre: "admin.membres", aide: "admin.membresAide", roles: ["admin_general"] },
  { to: "/admin/finance", icone: Banknote, titre: "admin.finance", aide: "admin.financeAide", roles: ["responsable_finance"] },
  { to: "/admin/mediatheque", icone: Play, titre: "admin.mediatheque", aide: "admin.mediathequeAide", roles: ["oustaz", "admin_contenus"] },
  { to: "/admin/evenements", icone: Calendar, titre: "admin.evenements", aide: "admin.evenementsAide", roles: ["admin_contenus"] },
  { to: "/admin/oustaz", icone: HelpCircle, titre: "admin.questions", aide: "admin.questionsAide", roles: ["oustaz"] },
  { to: "/admin/site", icone: Settings, titre: "admin.site", aide: "admin.siteAide", roles: ["oustaz", "admin_contenus"] },
];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { membre } = useAuth();
  const [stats, setStats] = useState<Statistiques | null>(null);

  useEffect(() => {
    api
      .get<Statistiques>("/comptes/statistiques/")
      .then((r) => setStats(r.data))
      .catch(() => setStats({}));
  }, []);

  const tuiles = stats
    ? [
        stats.membres !== undefined && { icone: Users, label: t("admin.statMembres"), valeur: stats.membres, aide: t("admin.statNouveaux", { count: stats.nouveaux_membres_mois ?? 0 }) },
        stats.cotisations_mois_total !== undefined && {
          icone: Banknote,
          label: t("admin.statCotisationsMois"),
          valeur: `${stats.cotisations_mois_payees}/${stats.cotisations_mois_total}`,
          ton: "or" as const,
        },
        stats.montant_encaisse_annee !== undefined && { icone: Banknote, label: t("admin.statEncaisse"), valeur: formatMontant(stats.montant_encaisse_annee) },
        stats.cotisations_en_retard !== undefined && {
          icone: AlertTriangle,
          label: t("admin.statImpayees"),
          valeur: stats.cotisations_en_retard,
          ton: stats.cotisations_en_retard ? ("rouge" as const) : ("vert" as const),
        },
        stats.questions_en_attente !== undefined && {
          icone: HelpCircle,
          label: t("admin.statQuestions"),
          valeur: stats.questions_en_attente,
          ton: stats.questions_en_attente ? ("or" as const) : ("vert" as const),
        },
        stats.contenus !== undefined && { icone: Play, label: t("admin.statContenus"), valeur: stats.contenus },
        stats.evenements_a_venir !== undefined && { icone: Calendar, label: t("admin.statEvenements"), valeur: stats.evenements_a_venir },
      ].filter(Boolean)
    : [];

  return (
    <AppShell large>
      <EnTete
        surTitre={membre ? t(`roles.${membre.role}`) : ""}
        titre={t("admin.titre")}
        sousTitre={t("admin.sousTitre")}
      />

      {stats === null ? (
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Squelette key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <ListeAnimee className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {tuiles.map((tuile) =>
            tuile ? (
              <ElementAnime key={tuile.label}>
                <Stat icone={tuile.icone} label={tuile.label} valeur={tuile.valeur} aide={"aide" in tuile ? tuile.aide : undefined} ton={"ton" in tuile ? tuile.ton : "vert"} />
              </ElementAnime>
            ) : null,
          )}
        </ListeAnimee>
      )}

      <h2 className="mb-3 text-lg font-bold text-text-primary">{t("admin.gerer")}</h2>
      <ListeAnimee className="grid gap-3 md:grid-cols-2">
        {SECTIONS.filter((s) => aAcces(membre, s.roles)).map(({ to, icone: Icone, titre, aide }) => (
          <ElementAnime key={to}>
            <Link to={to}>
              <CardInteractive className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
                  <Icone className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary">{t(titre)}</p>
                  <p className="text-sm text-text-secondary">{t(aide)}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-text-secondary rtl:rotate-180" />
              </CardInteractive>
            </Link>
          </ElementAnime>
        ))}
        {aAcces(membre, ["admin_general"]) && (
          <ElementAnime>
            <Link to="/admin/membres?nouveau=1">
              <CardInteractive className="flex items-center gap-4 border-dashed p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-secondary/15 text-accent-secondary-text">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary">{t("admin.inviter")}</p>
                  <p className="text-sm text-text-secondary">{t("admin.inviterAide")}</p>
                </div>
              </CardInteractive>
            </Link>
          </ElementAnime>
        )}
      </ListeAnimee>
    </AppShell>
  );
}
