import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Bus, CalendarPlus, CheckCircle2, Clock, MapPin, Minus, Plus, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { PaveDate } from "@/components/metier/Elements";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Squelette, Vide } from "@/components/ui/Divers";
import { Confirmation } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Traduit, useTraduit } from "@/context/TraductionContext";
import { api, messageErreur, type Evenement } from "@/lib/api";
import { cn, formatDateHeure } from "@/lib/utils";

function useCompteARebours(date: string | undefined) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (!date) return null;
  const ecart = new Date(date).getTime() - maintenant;
  if (ecart <= 0) return null;
  return {
    jours: Math.floor(ecart / 86_400_000),
    heures: Math.floor((ecart % 86_400_000) / 3_600_000),
    minutes: Math.floor((ecart % 3_600_000) / 60_000),
  };
}

/** Lien « Ajouter à Google Agenda ». */
function lienAgenda(ev: Evenement) {
  const debut = new Date(ev.date);
  const fin = new Date(debut.getTime() + 3 * 3_600_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.titre,
    dates: `${f(debut)}/${f(fin)}`,
    details: ev.description,
    location: ev.lieu,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default function EvenementDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { membre } = useAuth();
  const { notifier } = useToast();
  const [evenement, setEvenement] = useState<Evenement | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [bus, setBus] = useState<number | null>(null);
  const [places, setPlaces] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [annulation, setAnnulation] = useState(false);
  const titreTraduit = useTraduit(evenement?.titre);

  const charger = () =>
    api
      .get<Evenement>(`/evenements/evenements/${id}/`)
      .then((res) => setEvenement(res.data))
      .catch(() => setIntrouvable(true));

  useEffect(() => {
    if (id) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const compte = useCompteARebours(evenement?.date);

  const reserver = async () => {
    if (!evenement || !bus) return;
    setEnvoi(true);
    try {
      await api.post("/evenements/reservations-bus/", { evenement: evenement.id, bus_numero: bus, nb_places: places });
      notifier(t("evenements.reservationConfirmee"));
      await charger();
    } catch (err) {
      notifier(messageErreur(err, t("evenements.reservationImpossible")), "erreur");
      await charger();
    } finally {
      setEnvoi(false);
    }
  };

  const annuler = async () => {
    if (!evenement?.ma_reservation) return;
    setEnvoi(true);
    try {
      await api.delete(`/evenements/reservations-bus/${evenement.ma_reservation.id}/`);
      notifier(t("evenements.reservationAnnulee"));
      setAnnulation(false);
      setBus(null);
      await charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const partager = async () => {
    try {
      if (navigator.share) await navigator.share({ title: titreTraduit, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        notifier(t("commun.lienCopie"));
      }
    } catch {
      /* annulé */
    }
  };

  if (introuvable)
    return (
      <AppShell>
        <Vide icone={Clock} titre={t("evenements.introuvable")} action={<Button onClick={() => navigate("/evenements")}>{t("nav.evenements")}</Button>} />
      </AppShell>
    );

  if (!evenement)
    return (
      <AppShell>
        <Squelette className="mb-4 h-40 w-full rounded-[28px]" />
        <Squelette className="h-32 w-full" />
      </AppShell>
    );

  const passe = new Date(evenement.date) < new Date();
  const busChoisi = evenement.bus.find((b) => b.numero === bus);
  const maxPlaces = Math.min(10, busChoisi?.places_restantes ?? 10);

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("commun.retour")}
      </button>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B3D2E] to-[#1E7A5D] p-6 text-white md:p-8"
      >
        <div className="motif-etoiles pointer-events-none absolute inset-0" />
        <div className="relative flex items-start gap-5">
          <div className="rounded-2xl bg-white/10 p-1 backdrop-blur">
            <PaveDate date={evenement.date} />
          </div>
          <div className="min-w-0 flex-1">
            <Badge tone="or" className="mb-2 bg-white/15 text-[#F3E7C4]">
              {t(`evenements.categories.${evenement.categorie}`)}
            </Badge>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">{titreTraduit}</h1>
          </div>
        </div>

        {compte && (
          <div className="relative mt-6 grid max-w-sm grid-cols-3 gap-2">
            {[
              [compte.jours, t("evenements.jours")],
              [compte.heures, t("evenements.heures")],
              [compte.minutes, t("evenements.minutes")],
            ].map(([valeur, label]) => (
              <div key={String(label)} className="rounded-2xl bg-white/10 py-3 text-center backdrop-blur">
                <p className="text-2xl font-bold tabular-nums">{valeur}</p>
                <p className="text-[11px] uppercase tracking-wider text-white/70">{label}</p>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-5">
            <p className="flex items-start gap-3 text-sm text-text-primary">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
              <span className="first-letter:uppercase">{formatDateHeure(evenement.date)}</span>
            </p>
            {evenement.lieu && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evenement.lieu)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 text-sm text-text-primary hover:text-accent-primary"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
                <span className="underline decoration-border-subtle underline-offset-4">
                  {evenement.lieu}
                </span>
              </a>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              {!passe && (
                <Button asChild variant="secondary" size="sm">
                  <a href={lienAgenda(evenement)} target="_blank" rel="noreferrer">
                    <CalendarPlus className="h-4 w-4" /> {t("evenements.ajouterAgenda")}
                  </a>
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={partager}>
                <Share2 className="h-4 w-4" /> {t("mediatheque.partager")}
              </Button>
            </div>
          </Card>
          {evenement.description && (
            <Card className="p-6">
              <p className="whitespace-pre-line leading-relaxed text-text-primary">
                <Traduit texte={evenement.description} />
              </p>
            </Card>
          )}
        </div>

        {evenement.reservation_bus_active && !passe && (
          <Card className="h-fit p-5">
            <h2 className="mb-1 flex items-center gap-2 font-bold text-text-primary">
              <Bus className="h-5 w-5 text-accent-primary" /> {t("evenements.busTitre")}
            </h2>
            <p className="mb-4 text-sm text-text-secondary">{t("evenements.busAide")}</p>

            <AnimatePresence mode="wait">
              {!membre ? (
                <Button asChild className="w-full">
                  <Link to="/connexion" state={{ depuis: `/evenements/${evenement.id}` }}>
                    {t("evenements.connectezVous")}
                  </Link>
                </Button>
              ) : evenement.ma_reservation ? (
                <motion.div key="resa" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="mb-3 rounded-2xl bg-accent-soft p-4 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-status-success" />
                    <p className="font-semibold text-text-primary">{t("evenements.reservationConfirmee")}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {t("evenements.busNumero", { numero: evenement.ma_reservation.bus_numero })} ·{" "}
                      {t("evenements.nbPlaces", { count: evenement.ma_reservation.nb_places })}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full text-status-error" onClick={() => setAnnulation(true)}>
                    {t("evenements.annulerReservation")}
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="choix" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {evenement.bus.map((b) => {
                      const complet = b.places_restantes === 0;
                      const ratio = b.places_total ? 1 - (b.places_restantes ?? 0) / b.places_total : 0;
                      return (
                        <button
                          key={b.numero}
                          disabled={complet}
                          onClick={() => {
                            setBus(b.numero);
                            setPlaces(1);
                          }}
                          className={cn(
                            "rounded-2xl border-2 p-3 text-start transition-all",
                            bus === b.numero
                              ? "border-accent-primary bg-accent-soft"
                              : "border-border-subtle hover:border-accent-primary/40",
                            complet && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                            <Bus className="h-4 w-4" /> {t("evenements.busNumero", { numero: b.numero })}
                          </p>
                          <p className={cn("mt-0.5 text-xs", complet ? "text-status-error" : "text-text-secondary")}>
                            {complet
                              ? t("evenements.complet")
                              : b.places_restantes === null
                                ? t("evenements.placesLibres")
                                : t("evenements.placesRestantes", { count: b.places_restantes })}
                          </p>
                          {b.places_total > 0 && (
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-subtle">
                              <motion.div
                                className={cn("h-full rounded-full", ratio > 0.85 ? "bg-status-warning" : "bg-accent-primary")}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round(ratio * 100)}%` }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {bus && (
                    <div className="mb-4 flex items-center justify-between rounded-2xl border border-border-subtle p-3">
                      <span className="text-sm font-semibold text-text-primary">{t("evenements.combienDePlaces")}</span>
                      <div className="flex items-center gap-3">
                        <Button variant="secondary" size="icon" className="h-9 w-9" onClick={() => setPlaces((p) => Math.max(1, p - 1))} aria-label="-">
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center font-bold tabular-nums">{places}</span>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setPlaces((p) => Math.min(maxPlaces, p + 1))}
                          aria-label="+"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button className="w-full" disabled={!bus} chargement={envoi} onClick={reserver}>
                    {t("evenements.reserverPlace")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}
      </div>

      <Confirmation
        ouvert={annulation}
        onFermer={() => setAnnulation(false)}
        onConfirmer={annuler}
        titre={t("evenements.annulerReservation")}
        message={t("evenements.annulerConfirmation")}
        libelleConfirmer={t("evenements.annulerReservation")}
        chargement={envoi}
      />
    </AppShell>
  );
}
