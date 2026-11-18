import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bus, Calendar, MapPin } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api, type Evenement } from "@/lib/api";

export default function EvenementDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [evenement, setEvenement] = useState<Evenement | null>(null);
  const [reserve, setReserve] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get<Evenement>(`/evenements/evenements/${id}/`).then((res) => setEvenement(res.data));
  }, [id]);

  const reserverBus = async () => {
    setErreur("");
    try {
      await api.post("/evenements/reservations-bus/", { evenement: id, bus_numero: 1, nb_places: 1 });
      setReserve(true);
    } catch {
      setErreur(t("evenements.reservationImpossible"));
    }
  };

  if (!evenement) return <AppShell><p className="text-text-secondary">{t("commun.chargement")}</p></AppShell>;

  return (
    <AppShell>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-text-secondary">
        <ArrowLeft className="h-4 w-4" /> {t("commun.retour")}
      </button>

      <div className="mb-4 flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold text-text-primary">{evenement.titre}</h1>
        <Badge tone="neutral">{t(`evenements.categories.${evenement.categorie}`)}</Badge>
      </div>

      <div className="mb-5 flex flex-col gap-2 text-sm text-text-secondary">
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {new Date(evenement.date).toLocaleString("fr-FR")}
        </span>
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4" /> {evenement.lieu}
        </span>
      </div>

      <Card className="mb-5 leading-relaxed text-text-primary">{evenement.description}</Card>

      {evenement.reservation_bus_active && (
        <Card>
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
            <Bus className="h-4 w-4 text-accent-primary" /> {t("evenements.busDisponible")}
          </h3>
          {reserve ? (
            <p className="text-sm text-status-success">{t("evenements.reservationConfirmee")}</p>
          ) : (
            <>
              {erreur && <p className="mb-2 text-sm text-status-error">{erreur}</p>}
              <Button onClick={reserverBus} className="w-full">
                {t("evenements.reserverPlace")}
              </Button>
            </>
          )}
        </Card>
      )}
    </AppShell>
  );
}
