import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FileText, Headphones, Video } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { TopBarControls } from "@/components/layout/TopBarControls";
import { Badge, Card } from "@/components/ui/Card";
import { api, type ContenuMedia, type Paginated } from "@/lib/api";

const ICONES: Record<string, typeof Headphones> = {
  audio: Headphones,
  video: Video,
  texte: FileText,
};

export default function Mediatheque() {
  const { t } = useTranslation();
  const [contenus, setContenus] = useState<ContenuMedia[]>([]);
  const [filtre, setFiltre] = useState<string>("tous");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    const params = filtre === "tous" ? "" : `?type=${filtre}`;
    api
      .get<Paginated<ContenuMedia>>(`/mediatheque/contenus/${params}`)
      .then((res) => setContenus(res.data.results))
      .catch(() => setContenus([]))
      .finally(() => setChargement(false));
  }, [filtre]);

  const onglets = [
    { id: "tous", label: t("mediatheque.tous") },
    { id: "audio", label: t("mediatheque.audio") },
    { id: "video", label: t("mediatheque.video") },
    { id: "texte", label: t("mediatheque.texte") },
  ];

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">{t("nav.mediatheque")}</h1>
        <TopBarControls />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {onglets.map((onglet) => (
          <button
            key={onglet.id}
            onClick={() => setFiltre(onglet.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              filtre === onglet.id
                ? "bg-accent-primary text-white"
                : "bg-bg-secondary text-text-secondary"
            }`}
          >
            {onglet.label}
          </button>
        ))}
      </div>

      {chargement && <p className="text-sm text-text-secondary">{t("commun.chargement")}</p>}

      <div className="flex flex-col gap-3">
        {contenus.map((contenu) => {
          const Icone = ICONES[contenu.type] ?? FileText;
          return (
            <Link key={contenu.id} to={`/mediatheque/${contenu.id}`}>
              <Card className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-primary">
                  <Icone className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text-primary">{contenu.titre}</p>
                  <p className="text-sm text-text-secondary">{contenu.description}</p>
                </div>
                <Badge tone="neutral">{contenu.type}</Badge>
              </Card>
            </Link>
          );
        })}
        {!chargement && contenus.length === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">{t("mediatheque.aucunResultat")}</p>
        )}
      </div>
    </AppShell>
  );
}
