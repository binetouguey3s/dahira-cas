import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Calendar, CheckCircle2, Download, Heart, Share2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ICONES_CONTENU } from "@/components/metier/Elements";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Squelette, Vide } from "@/components/ui/Divers";
import { Textarea } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Traduit } from "@/context/TraductionContext";
import { api, messageErreur, type ContenuMedia } from "@/lib/api";
import { formatDate, lienIntegrable } from "@/lib/utils";

export default function MediaDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { membre } = useAuth();
  const { notifier } = useToast();
  const [contenu, setContenu] = useState<ContenuMedia | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [question, setQuestion] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<ContenuMedia>(`/mediatheque/contenus/${id}/`)
      .then((res) => setContenu(res.data))
      .catch(() => setIntrouvable(true));
  }, [id]);

  const aimer = async () => {
    if (!membre) {
      notifier(t("mediatheque.connectezVousPourAimer"), "info");
      return;
    }
    if (!contenu) return;
    // Mise à jour immédiate, corrigée par la réponse du serveur.
    setContenu({ ...contenu, aime: !contenu.aime, nb_likes: contenu.nb_likes + (contenu.aime ? -1 : 1) });
    try {
      const { data } = await api.post<{ nb_likes: number; aime: boolean }>(`/mediatheque/contenus/${contenu.id}/aimer/`);
      setContenu((c) => (c ? { ...c, ...data } : c));
    } catch {
      setContenu(contenu);
    }
  };

  const telecharger = () => {
    if (!contenu) return;
    const lien = contenu.fichier || contenu.url_externe;
    if (lien) window.open(lien, "_blank", "noopener");
    api
      .post<{ nb_telechargements: number }>(`/mediatheque/contenus/${contenu.id}/telecharger/`)
      .then((res) => setContenu((c) => (c ? { ...c, ...res.data } : c)))
      .catch(() => undefined);
  };

  const partager = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: contenu?.titre, url });
      else {
        await navigator.clipboard.writeText(url);
        notifier(t("commun.lienCopie"));
      }
    } catch {
      /* partage annulé */
    }
  };

  const poserQuestion = async () => {
    if (!question.trim() || !contenu) return;
    setEnvoi(true);
    try {
      await api.post("/questions-reponses/questions/", { theme: "autre", texte: `[${contenu.titre}] ${question.trim()}` });
      setEnvoye(true);
      setQuestion("");
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  if (introuvable)
    return (
      <AppShell>
        <Vide icone={ICONES_CONTENU.texte} titre={t("mediatheque.introuvable")} action={<Button onClick={() => navigate("/mediatheque")}>{t("nav.mediatheque")}</Button>} />
      </AppShell>
    );

  if (!contenu)
    return (
      <AppShell>
        <Squelette className="mb-4 h-8 w-2/3" />
        <Squelette className="mb-6 h-4 w-1/3" />
        <Squelette className="aspect-video w-full rounded-[var(--radius-lg)]" />
      </AppShell>
    );

  const Icone = ICONES_CONTENU[contenu.type];
  const integrable = contenu.url_externe ? lienIntegrable(contenu.url_externe) : null;

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("commun.retour")}
      </button>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="success">
          <Icone className="h-3.5 w-3.5" /> {t(`mediatheque.types.${contenu.type}`)}
        </Badge>
        {contenu.evenement_titre && (
          <Link to={`/evenements/${contenu.evenement}`}>
            <Badge tone="or">
              <Calendar className="h-3.5 w-3.5" /> <Traduit texte={contenu.evenement_titre} />
            </Badge>
          </Link>
        )}
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
        <Traduit texte={contenu.titre} />
      </h1>
      <p className="mb-6 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        <span className="flex items-center gap-1.5">
          <User className="h-4 w-4" /> {contenu.auteur}
        </span>
        <span>{formatDate(contenu.date_publication)}</span>
      </p>

      {/* Lecteur */}
      {(contenu.type === "video" || contenu.type === "audio") && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          {integrable ? (
            <div className="aspect-video overflow-hidden rounded-[var(--radius-lg)] bg-black shadow-xl">
              <iframe
                className="h-full w-full"
                src={integrable}
                title={contenu.titre}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : contenu.type === "video" && contenu.fichier ? (
            <video controls preload="metadata" className="w-full rounded-[var(--radius-lg)] bg-black shadow-xl" src={contenu.fichier} />
          ) : contenu.fichier || contenu.url_externe ? (
            <Card className="flex items-center gap-4 bg-gradient-to-br from-accent-soft to-bg-elevated p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-primary text-white">
                <Icone className="h-6 w-6" />
              </div>
              <audio controls preload="metadata" className="w-full" src={contenu.fichier || contenu.url_externe} />
            </Card>
          ) : null}
        </motion.div>
      )}

      {contenu.description && (
        <Card className="mb-6 p-6">
          <p
            className={`whitespace-pre-line leading-relaxed text-text-primary ${
              contenu.type === "texte" ? "font-serif text-lg" : ""
            }`}
          >
            <Traduit texte={contenu.description} />
          </p>
        </Card>
      )}

      {/* Actions */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Button variant="outline" onClick={aimer} className="gap-2" aria-pressed={contenu.aime}>
          <motion.span key={String(contenu.aime)} initial={{ scale: 0.4 }} animate={{ scale: [1.35, 1] }} transition={{ duration: 0.35 }}>
            <Heart className={`h-4 w-4 ${contenu.aime ? "fill-status-error text-status-error" : ""}`} />
          </motion.span>
          <span className="tabular-nums">{contenu.nb_likes}</span>
        </Button>
        {(contenu.fichier || contenu.url_externe) && (
          <Button variant="outline" onClick={telecharger} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{contenu.fichier ? t("mediatheque.telecharger") : t("mediatheque.ouvrir")}</span>
          </Button>
        )}
        <Button variant="outline" onClick={partager} className="gap-2">
          <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">{t("mediatheque.partager")}</span>
        </Button>
      </div>

      {/* Question sur l'enseignement */}
      <Card className="p-6">
        <h2 className="mb-1 font-bold text-text-primary">{t("mediatheque.poserQuestion")}</h2>
        <p className="mb-4 text-sm text-text-secondary">{t("mediatheque.poserQuestionAide")}</p>
        <AnimatePresence mode="wait">
          {!membre ? (
            <Button asChild variant="secondary">
              <Link to="/connexion" state={{ depuis: `/mediatheque/${contenu.id}` }}>
                {t("mediatheque.connectezVousPourQuestion")}
              </Link>
            </Button>
          ) : envoye ? (
            <motion.p
              key="ok"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-xl bg-accent-soft p-4 text-sm text-status-success"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t("mediatheque.questionEnvoyee")}{" "}
                <Link to="/questions-reponses" className="font-semibold underline">
                  {t("nav.qa")}
                </Link>
              </span>
            </motion.p>
          ) : (
            <motion.div key="form" exit={{ opacity: 0 }}>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("mediatheque.placeholderQuestion")}
                rows={3}
              />
              <Button onClick={poserQuestion} chargement={envoi} disabled={!question.trim()} className="mt-3 w-full sm:w-auto">
                {t("commun.envoyer")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </AppShell>
  );
}
