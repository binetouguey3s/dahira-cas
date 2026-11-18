import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BookOpen, Calendar, HeartHandshake, Play } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { TopBarControls } from "@/components/layout/TopBarControls";
import { Card } from "@/components/ui/Card";
import { api, type ContenuMedia, type Evenement, type Paginated } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Accueil() {
  const { t } = useTranslation();
  const { membre } = useAuth();
  const [derniersContenus, setDerniersContenus] = useState<ContenuMedia[]>([]);
  const [prochainEvenement, setProchainEvenement] = useState<Evenement | null>(null);

  useEffect(() => {
    api
      .get<Paginated<ContenuMedia>>("/mediatheque/contenus/?ordering=-date_publication")
      .then((res) => setDerniersContenus(res.data.results.slice(0, 3)))
      .catch(() => undefined);
    api
      .get<Paginated<Evenement>>("/evenements/evenements/?ordering=date")
      .then((res) => setProchainEvenement(res.data.results[0] ?? null))
      .catch(() => undefined);
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            {t("accueil.salutation", { nom: membre?.nom_complet?.split(" ")[0] ?? "" })}
          </p>
          <h1 className="text-xl font-bold text-text-primary">{t("accueil.titre")}</h1>
        </div>
        <TopBarControls />
      </div>

      <Card className="mb-6 bg-gradient-to-br from-accent-primary to-[#0B3D2E] text-white">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/70">
          {t("accueil.conseilDuJour")}
        </p>
        <p className="font-serif text-lg leading-relaxed">{t("accueil.citationGuide")}</p>
      </Card>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Link to="/biographie">
          <Card className="flex flex-col items-center gap-2 py-5 text-center">
            <BookOpen className="h-6 w-6 text-accent-primary" />
            <span className="text-xs font-semibold text-text-primary">{t("nav.biographie")}</span>
          </Card>
        </Link>
        <Link to="/mediatheque">
          <Card className="flex flex-col items-center gap-2 py-5 text-center">
            <Play className="h-6 w-6 text-accent-primary" />
            <span className="text-xs font-semibold text-text-primary">{t("nav.mediatheque")}</span>
          </Card>
        </Link>
        <Link to="/evenements">
          <Card className="flex flex-col items-center gap-2 py-5 text-center">
            <Calendar className="h-6 w-6 text-accent-primary" />
            <span className="text-xs font-semibold text-text-primary">{t("nav.evenements")}</span>
          </Card>
        </Link>
      </div>

      {prochainEvenement && (
        <Link to="/evenements" className="mb-6 block">
          <Card className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-accent-soft text-accent-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase text-accent-primary">
                {t("accueil.prochainEvenement")}
              </p>
              <p className="font-semibold text-text-primary">{prochainEvenement.titre}</p>
              <p className="text-sm text-text-secondary">{prochainEvenement.lieu}</p>
            </div>
          </Card>
        </Link>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-text-primary">{t("accueil.dernierEnseignements")}</h2>
        <Link to="/mediatheque" className="text-sm font-semibold text-accent-primary">
          {t("accueil.voirTout")}
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {derniersContenus.map((contenu) => (
          <Link key={contenu.id} to={`/mediatheque/${contenu.id}`}>
            <Card className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent-primary">
                <Play className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text-primary">{contenu.titre}</p>
                <p className="text-sm text-text-secondary">{contenu.type}</p>
              </div>
            </Card>
          </Link>
        ))}
        {derniersContenus.length === 0 && (
          <Card className="flex flex-col items-center gap-2 py-8 text-center text-text-secondary">
            <HeartHandshake className="h-6 w-6" />
            <p className="text-sm">{t("accueil.aucunContenu")}</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
