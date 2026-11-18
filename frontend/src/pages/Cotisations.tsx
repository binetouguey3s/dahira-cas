import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { TopBarControls } from "@/components/layout/TopBarControls";
import { Badge, Card } from "@/components/ui/Card";
import { api, type Cotisation, type Paginated } from "@/lib/api";

const TONES: Record<string, "success" | "error" | "warning"> = {
  paye: "success",
  non_paye: "error",
  en_retard: "warning",
};

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function Cotisations() {
  const { t } = useTranslation();
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    api
      .get<Paginated<Cotisation>>("/finances/cotisations/?ordering=-annee,-mois")
      .then((res) => setCotisations(res.data.results))
      .finally(() => setChargement(false));
  }, []);

  const total = cotisations.reduce((acc, c) => acc + (c.statut === "paye" ? Number(c.montant) : 0), 0);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">{t("nav.cotisations")}</h1>
        <TopBarControls />
      </div>

      <Card className="mb-5 bg-gradient-to-br from-accent-primary to-[#0B3D2E] text-white">
        <p className="text-sm text-white/75">{t("cotisations.totalPaye")}</p>
        <p className="text-2xl font-bold">{total.toLocaleString("fr-FR")} FCFA</p>
      </Card>

      {chargement && <p className="text-sm text-text-secondary">{t("commun.chargement")}</p>}

      <div className="flex flex-col gap-3">
        {cotisations.map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-text-primary">
                {MOIS_FR[c.mois - 1]} {c.annee}
              </p>
              <p className="text-sm text-text-secondary">{Number(c.montant).toLocaleString("fr-FR")} FCFA</p>
            </div>
            <Badge tone={TONES[c.statut] ?? "neutral"}>{t(`cotisations.statuts.${c.statut}`)}</Badge>
          </Card>
        ))}
        {!chargement && cotisations.length === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">{t("cotisations.aucuneCotisation")}</p>
        )}
      </div>
    </AppShell>
  );
}
