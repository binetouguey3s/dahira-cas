import { motion } from "motion/react";
import { ArrowRight, BookOpen, Calendar, CreditCard, HelpCircle, Play, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { CarteContenu, CarteEvenement } from "@/components/metier/Elements";
import { ReseauxSociaux } from "@/components/metier/ReseauxSociaux";
import { VideoGuide } from "@/components/metier/VideoGuide";
import { Button } from "@/components/ui/Button";
import { ElementAnime, ListeAnimee, SqueletteListe, Vide } from "@/components/ui/Divers";
import { useAuth } from "@/context/AuthContext";
import { PHOTO_GUIDE_PAR_DEFAUT, useParametres } from "@/context/ParametresContext";
import { Traduit } from "@/context/TraductionContext";
import { api, type ContenuMedia, type Evenement, type Paginated } from "@/lib/api";

function salutation(heure: number) {
  if (heure < 12) return "accueil.bonjour";
  if (heure < 18) return "accueil.bonApresMidi";
  return "accueil.bonsoir";
}

export default function Accueil() {
  const { t } = useTranslation();
  const { membre } = useAuth();
  const { parametres } = useParametres();
  const [contenus, setContenus] = useState<ContenuMedia[] | null>(null);
  const [evenements, setEvenements] = useState<Evenement[] | null>(null);

  useEffect(() => {
    api
      .get<Paginated<ContenuMedia>>("/mediatheque/contenus/?ordering=-date_publication&page_size=4")
      .then((res) => setContenus(res.data.results.slice(0, 4)))
      .catch(() => setContenus([]));
    api
      .get<Paginated<Evenement>>("/evenements/evenements/?periode=a_venir&ordering=date")
      .then((res) => setEvenements(res.data.results.slice(0, 3)))
      .catch(() => setEvenements([]));
  }, []);

  const prenom = membre?.nom_complet?.split(" ")[0];

  const raccourcis = [
    { to: "/biographie", icone: BookOpen, label: t("nav.biographie") },
    { to: "/mediatheque", icone: Play, label: t("nav.mediatheque") },
    { to: "/evenements", icone: Calendar, label: t("nav.evenements") },
    ...(membre
      ? [
          { to: "/questions-reponses", icone: HelpCircle, label: t("nav.qa") },
          { to: "/cotisations", icone: Wallet, label: t("nav.cotisations") },
          { to: "/carte", icone: CreditCard, label: t("nav.carte") },
        ]
      : []),
  ];

  return (
    <AppShell>
      {/* Bandeau d'accueil */}
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B3D2E] via-[#145c45] to-[#1E7A5D] p-6 text-white shadow-[0_24px_60px_-24px_rgba(11,61,46,0.6)] md:p-10"
      >
        <div className="motif-etoiles pointer-events-none absolute inset-0" />
        <motion.div
          className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-[#D9C89A]/25 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="mb-2 text-sm font-medium text-[#D9C89A]">
              {membre ? t(salutation(new Date().getHours()), { nom: prenom }) : t("accueil.bienvenueVisiteur")}
            </p>
            <h1 className="max-w-xl text-2xl font-bold leading-tight md:text-4xl">{parametres.nom_dahira}</h1>
            <blockquote className="mt-5 max-w-xl">
              <p className="font-serif text-xl leading-relaxed text-white/95 md:text-2xl">
                {/* La parole du Guide par défaut est gardée telle quelle ; une citation saisie par l'admin est traduite. */}
                {parametres.citation_du_jour ? <Traduit texte={parametres.citation_du_jour} /> : `« ${t("accueil.citationParDefaut")} »`}
              </p>
              <footer className="mt-2 text-xs uppercase tracking-[0.16em] text-white/65">
                {t("accueil.conseilDuJour")} · {parametres.citation_auteur || parametres.nom_guide}
              </footer>
            </blockquote>
            {!membre && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="or" size="lg">
                  <Link to="/inscription">
                    {t("nav.devenirMembre")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="text-white hover:bg-white/10">
                  <Link to="/connexion">{t("nav.connexion")}</Link>
                </Button>
              </div>
            )}
          </div>
          {(
            <motion.img
              src={parametres.photo_guide || PHOTO_GUIDE_PAR_DEFAUT}
              alt={parametres.nom_guide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="h-44 w-36 self-center rounded-[28px] object-cover object-top ring-4 ring-white/15 md:h-60 md:w-48"
            />
          )}
        </div>
      </motion.section>

      {/* Raccourcis */}
      <ListeAnimee className="mb-10 grid grid-cols-3 gap-3 md:grid-cols-6">
        {raccourcis.map(({ to, icone: Icone, label }) => (
          <ElementAnime key={to}>
            <Link
              to={to}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-border-subtle bg-bg-elevated px-2 py-4 text-center transition-all duration-200 hover:-translate-y-1 hover:border-accent-primary/40 hover:shadow-[0_12px_28px_-14px_var(--glass-shadow)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-primary transition-transform duration-300 group-hover:scale-110">
                <Icone className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-text-primary">{label}</span>
            </Link>
          </ElementAnime>
        ))}
      </ListeAnimee>

      {parametres.video_guide_accueil && <VideoGuide parametres={parametres} className="mb-10 min-w-0" />}

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">{t("accueil.prochainsEvenements")}</h2>
            <Link to="/evenements" className="text-sm font-semibold text-accent-primary hover:underline">
              {t("commun.voirTout")}
            </Link>
          </div>
          {evenements === null ? (
            <SqueletteListe lignes={2} />
          ) : evenements.length ? (
            <ListeAnimee className="flex flex-col gap-3">
              {evenements.map((ev) => (
                <ElementAnime key={ev.id}>
                  <CarteEvenement evenement={ev} />
                </ElementAnime>
              ))}
            </ListeAnimee>
          ) : (
            <Vide icone={Calendar} titre={t("evenements.aucunAVenir")} />
          )}
        </section>

        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">{t("accueil.derniersEnseignements")}</h2>
            <Link to="/mediatheque" className="text-sm font-semibold text-accent-primary hover:underline">
              {t("commun.voirTout")}
            </Link>
          </div>
          {contenus === null ? (
            <SqueletteListe lignes={3} />
          ) : contenus.length ? (
            <ListeAnimee className="flex flex-col gap-3">
              {contenus.map((c) => (
                <ElementAnime key={c.id}>
                  <CarteContenu contenu={c} />
                </ElementAnime>
              ))}
            </ListeAnimee>
          ) : (
            <Vide icone={Play} titre={t("mediatheque.aucunContenu")} />
          )}
        </section>
      </div>

      {/* Nos canaux (réseaux sociaux du Dahira) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 min-w-0"
      >
        <h2 className="mb-1 text-lg font-bold text-text-primary">{t("accueil.nosCanaux")}</h2>
        <p className="mb-4 text-sm text-text-secondary">{t("accueil.nosCanauxAide")}</p>
        <ReseauxSociaux parametres={parametres} />
      </motion.section>
    </AppShell>
  );
}
