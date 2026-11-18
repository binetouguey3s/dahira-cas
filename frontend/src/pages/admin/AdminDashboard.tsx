import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Banknote, Calendar, MessageCircleQuestion, Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { TopBarControls } from "@/components/layout/TopBarControls";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ cotisations: 0, evenements: 0, questions: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/finances/cotisations/").then((r) => r.data.count ?? r.data.results?.length ?? 0),
      api.get("/evenements/evenements/").then((r) => r.data.count ?? r.data.results?.length ?? 0),
      api
        .get("/questions-reponses/questions/")
        .then((r) => (r.data.results ?? []).filter((q: { statut: string }) => q.statut === "en_attente").length),
    ]).then(([cotisations, evenements, questions]) => setStats({ cotisations, evenements, questions }));
  }, []);

  const cartes = [
    { to: "/admin/finance", icon: Banknote, label: t("admin.finance"), valeur: stats.cotisations },
    { to: "/admin/evenements", icon: Calendar, label: t("admin.evenements"), valeur: stats.evenements },
    { to: "/admin/oustaz", icon: MessageCircleQuestion, label: t("admin.questionsEnAttente"), valeur: stats.questions },
  ];

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">{t("admin.titre")}</h1>
        <TopBarControls />
      </div>

      <div className="flex flex-col gap-3">
        {cartes.map((carte) => (
          <Link key={carte.to} to={carte.to}>
            <Card className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent-primary">
                <carte.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text-primary">{carte.label}</p>
              </div>
              <p className="text-2xl font-bold text-accent-primary">{carte.valeur}</p>
            </Card>
          </Link>
        ))}
        <Card className="flex items-center gap-4 opacity-70">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent-primary">
            <Users className="h-6 w-6" />
          </div>
          <p className="font-semibold text-text-primary">{t("admin.gestionMembresBientot")}</p>
        </Card>
      </div>
    </AppShell>
  );
}
