import { useTranslation } from "react-i18next";
import { LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { TopBarControls } from "@/components/layout/TopBarControls";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function Profil() {
  const { t } = useTranslation();
  const { membre, deconnecter } = useAuth();
  const navigate = useNavigate();

  if (!membre) return null;

  const deconnexion = () => {
    deconnecter();
    navigate("/connexion");
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">{t("nav.profil")}</h1>
        <TopBarControls />
      </div>

      <Card className="mb-5 flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-2xl font-bold text-accent-primary">
          {membre.nom_complet.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">{membre.nom_complet}</h2>
          <p className="text-sm text-text-secondary">{membre.telephone}</p>
        </div>
        <Badge tone="success">{t("profil.carte")} {membre.carte_numero}</Badge>
        {membre.role !== "membre" && (
          <Badge tone="warning">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> {t(`profil.roles.${membre.role}`)}
            </span>
          </Badge>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <Card className="flex items-center justify-between">
          <span className="text-text-secondary">{t("profil.email")}</span>
          <span className="font-semibold text-text-primary">{membre.email || "—"}</span>
        </Card>
        <Card className="flex items-center justify-between">
          <span className="text-text-secondary">{t("profil.langue")}</span>
          <span className="font-semibold text-text-primary">{membre.langue_preferee.toUpperCase()}</span>
        </Card>
        <Card className="flex items-center justify-between">
          <span className="text-text-secondary">{t("profil.membreDepuis")}</span>
          <span className="font-semibold text-text-primary">
            {new Date(membre.date_inscription).toLocaleDateString()}
          </span>
        </Card>
      </div>

      <Button variant="outline" onClick={deconnexion} className="mt-6 w-full gap-2 text-status-error">
        <LogOut className="h-4 w-4" /> {t("profil.deconnexion")}
      </Button>
    </AppShell>
  );
}
