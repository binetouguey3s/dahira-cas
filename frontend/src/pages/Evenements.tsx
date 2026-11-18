import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { TopBarControls } from "@/components/layout/TopBarControls";
import { Badge, Card } from "@/components/ui/Card";
import { api, type Evenement, type Paginated } from "@/lib/api";

export default function Evenements() {
  const { t } = useTranslation();
  const [evenements, setEvenements] = useState<Evenement[]>([]);

  useEffect(() => {
    api
      .get<Paginated<Evenement>>("/evenements/evenements/?ordering=date")
      .then((res) => setEvenements(res.data.results));
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">{t("nav.evenements")}</h1>
        <TopBarControls />
      </div>

      <div className="flex flex-col gap-3">
        {evenements.map((ev) => (
          <Link key={ev.id} to={`/evenements/${ev.id}`}>
            <Card>
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-semibold text-text-primary">{ev.titre}</p>
                <Badge tone="neutral">{t(`evenements.categories.${ev.categorie}`)}</Badge>
              </div>
              <p className="mb-2 line-clamp-2 text-sm text-text-secondary">{ev.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(ev.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {ev.lieu}
                </span>
              </div>
            </Card>
          </Link>
        ))}
        {evenements.length === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">{t("evenements.aucunEvenement")}</p>
        )}
      </div>
    </AppShell>
  );
}
