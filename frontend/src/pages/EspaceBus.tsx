import { Bus, ChevronRight, Clock, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { PaveDate } from "@/components/metier/Elements";
import { Badge, Card } from "@/components/ui/Card";
import { ElementAnime, EnTete, ListeAnimee, SqueletteListe, Vide } from "@/components/ui/Divers";
import { api, type EvenementEspaceBus } from "@/lib/api";
import { formatDateHeure } from "@/lib/utils";

/** Espace du responsable des bus : les événements dont il gère les réservations. */
export default function EspaceBus() {
  const { t } = useTranslation();
  const [evenements, setEvenements] = useState<EvenementEspaceBus[] | null>(null);

  useEffect(() => {
    api
      .get<EvenementEspaceBus[]>("/evenements/evenements/espace-bus/")
      .then((res) => setEvenements(res.data))
      .catch(() => setEvenements([]));
  }, []);

  return (
    <AppShell>
      <EnTete surTitre={t("nav.monEspace")} titre={t("nav.espaceBus")} sousTitre={t("bus.espaceSousTitre")} />
      {evenements === null ? (
        <SqueletteListe />
      ) : evenements.length ? (
        <ListeAnimee className="flex flex-col gap-3">
          {evenements.map((ev) => {
            const passe = new Date(ev.date) < new Date();
            return (
              <ElementAnime key={ev.id}>
                <Link to={`/espace-bus/${ev.id}`}>
                  <Card className="flex items-center gap-4 transition hover:border-accent-primary/40">
                    <PaveDate date={ev.date} passe={passe} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text-primary">{ev.titre}</p>
                      <p className="truncate text-sm text-text-secondary first-letter:uppercase">{formatDateHeure(ev.date)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge>
                          <Bus className="h-3 w-3" /> {ev.places_occupees}/{ev.capacite}
                        </Badge>
                        {ev.paiements_a_verifier > 0 && (
                          <Badge tone="warning">
                            <Wallet className="h-3 w-3" /> {t("bus.aVerifierCompte", { count: ev.paiements_a_verifier })}
                          </Badge>
                        )}
                        {ev.en_attente > 0 && (
                          <Badge tone="or">
                            <Clock className="h-3 w-3" /> {t("bus.enAttenteCompte", { count: ev.en_attente })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-text-secondary rtl:rotate-180" />
                  </Card>
                </Link>
              </ElementAnime>
            );
          })}
        </ListeAnimee>
      ) : (
        <Vide icone={Bus} titre={t("bus.aucunEvenement")} message={t("bus.aucunEvenementAide")} />
      )}
    </AppShell>
  );
}
