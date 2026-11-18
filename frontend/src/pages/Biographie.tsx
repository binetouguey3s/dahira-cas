import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { TopBarControls } from "@/components/layout/TopBarControls";
import { Card } from "@/components/ui/Card";

export default function Biographie() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">{t("nav.biographie")}</h1>
        <TopBarControls />
      </div>

      <Card className="mb-4 flex flex-col items-center gap-3 py-8 text-center">
        <div className="h-24 w-24 rounded-full bg-accent-soft" />
        <h2 className="text-lg font-bold text-text-primary">{t("biographie.nomGuide")}</h2>
        <p className="text-sm text-text-secondary">{t("biographie.titreGuide")}</p>
      </Card>

      <Card className="mb-4">
        <h3 className="mb-2 font-semibold text-text-primary">{t("biographie.parcours")}</h3>
        <p className="leading-relaxed text-text-secondary">{t("biographie.texteParcours")}</p>
      </Card>

      <Card className="mb-4">
        <h3 className="mb-2 font-semibold text-text-primary">{t("biographie.vision")}</h3>
        <p className="leading-relaxed text-text-secondary">{t("biographie.texteVision")}</p>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold text-text-primary">{t("biographie.enseignements")}</h3>
        <p className="leading-relaxed text-text-secondary">{t("biographie.texteEnseignements")}</p>
      </Card>
    </AppShell>
  );
}
