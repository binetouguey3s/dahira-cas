import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api, type Cotisation, type Paginated } from "@/lib/api";

const TONES: Record<string, "success" | "error" | "warning"> = {
  paye: "success",
  non_paye: "error",
  en_retard: "warning",
};

export default function Finance() {
  const { t } = useTranslation();
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);

  const charger = () => {
    api
      .get<Paginated<Cotisation>>("/finances/cotisations/?ordering=-annee,-mois")
      .then((res) => setCotisations(res.data.results));
  };

  useEffect(() => {
    charger();
  }, []);

  const marquerPaye = async (id: number) => {
    await api.patch(`/finances/cotisations/${id}/`, { statut: "paye" });
    charger();
  };

  return (
    <AppShell>
      <Link to="/admin" className="mb-4 flex items-center gap-1 text-sm text-text-secondary">
        <ArrowLeft className="h-4 w-4" /> {t("commun.retour")}
      </Link>
      <h1 className="mb-6 text-xl font-bold text-text-primary">{t("admin.finance")}</h1>

      <div className="flex flex-col gap-3">
        {cotisations.map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-text-primary">{c.membre_nom}</p>
              <p className="text-sm text-text-secondary">
                {c.mois}/{c.annee} — {Number(c.montant).toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={TONES[c.statut] ?? "neutral"}>{t(`cotisations.statuts.${c.statut}`)}</Badge>
              {c.statut !== "paye" && (
                <Button variant="outline" onClick={() => marquerPaye(c.id)}>
                  {t("admin.marquerPaye")}
                </Button>
              )}
            </div>
          </Card>
        ))}
        {cotisations.length === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">{t("cotisations.aucuneCotisation")}</p>
        )}
      </div>
    </AppShell>
  );
}
