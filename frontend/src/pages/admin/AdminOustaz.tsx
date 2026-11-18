import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, MessageCircleQuestion, Pencil, Search, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Avatar, ElementAnime, EnTete, ListeAnimee, Onglets, SqueletteListe, Vide } from "@/components/ui/Divers";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { Traduit } from "@/context/TraductionContext";
import { api, messageErreur, toutesLesPages, type Question } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminOustaz() {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [onglet, setOnglet] = useState<"en_attente" | "repondu">("en_attente");
  const [recherche, setRecherche] = useState("");
  const [brouillons, setBrouillons] = useState<Record<number, string>>({});
  const [enEdition, setEnEdition] = useState<number | null>(null);
  const [envoiId, setEnvoiId] = useState<number | null>(null);

  const charger = () =>
    toutesLesPages<Question>("/questions-reponses/questions/?ordering=date_creation")
      .then(setQuestions)
      .catch(() => setQuestions([]));

  useEffect(() => {
    charger();
  }, []);

  const repondre = async (q: Question) => {
    const texte = brouillons[q.id]?.trim();
    if (!texte) return;
    setEnvoiId(q.id);
    try {
      await api.post(`/questions-reponses/questions/${q.id}/repondre/`, { texte });
      notifier(t("oustaz.reponseEnvoyee"));
      setBrouillons((b) => ({ ...b, [q.id]: "" }));
      setEnEdition(null);
      await charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoiId(null);
    }
  };

  const liste = questions ?? [];
  const nbAttente = liste.filter((q) => q.statut === "en_attente").length;
  const visibles = liste
    .filter((q) => q.statut === onglet)
    .filter((q) => !recherche.trim() || `${q.texte} ${q.membre_nom}`.toLowerCase().includes(recherche.toLowerCase()));
  if (onglet === "repondu") visibles.reverse();

  return (
    <AppShell large>
      <EnTete surTitre={t("nav.administration")} titre={t("admin.questions")} sousTitre={t("oustaz.sousTitre")} />

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <Onglets
          className="md:w-96"
          valeur={onglet}
          onChange={setOnglet}
          options={[
            { id: "en_attente", label: t("questionsReponses.enAttente"), compteur: nbAttente },
            { id: "repondu", label: t("questionsReponses.repondues") },
          ]}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t("oustaz.rechercher")} className="ps-11" />
        </div>
      </div>

      {questions === null ? (
        <SqueletteListe />
      ) : visibles.length ? (
        <ListeAnimee key={onglet} className="flex flex-col gap-4">
          {visibles.map((q) => {
            const edite = q.statut === "en_attente" || enEdition === q.id;
            return (
              <ElementAnime key={q.id}>
                <Card className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Avatar nom={q.membre_nom} taille={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">{q.membre_nom}</p>
                      <p className="text-xs text-text-secondary">{formatDate(q.date_creation)}</p>
                    </div>
                    <Badge tone="or">{t(`questionsReponses.themes.${q.theme}`)}</Badge>
                  </div>
                  <p className="whitespace-pre-line text-text-primary">
                    <Traduit texte={q.texte} />
                  </p>
                  {q.audio && <audio controls className="mt-3 w-full" src={q.audio} />}

                  <AnimatePresence mode="wait">
                    {edite ? (
                      <motion.div key="edit" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
                        <Textarea
                          value={brouillons[q.id] ?? q.reponse?.texte ?? ""}
                          onChange={(e) => setBrouillons((b) => ({ ...b, [q.id]: e.target.value }))}
                          placeholder={t("admin.redigerReponse")}
                          rows={4}
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          {enEdition === q.id && (
                            <Button variant="ghost" onClick={() => setEnEdition(null)}>
                              {t("commun.annuler")}
                            </Button>
                          )}
                          <Button
                            onClick={() => repondre({ ...q })}
                            chargement={envoiId === q.id}
                            disabled={!(brouillons[q.id] ?? q.reponse?.texte ?? "").trim()}
                          >
                            <Send className="h-4 w-4 rtl:rotate-180" /> {t("admin.repondre")}
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      q.reponse && (
                        <motion.div key="rep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl border-s-4 border-accent-primary bg-accent-soft p-4">
                          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("questionsReponses.reponseOustaz")} · {formatDate(q.reponse.date_publication)}
                          </p>
                          <p className="whitespace-pre-line text-sm text-text-primary">{q.reponse.texte}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setBrouillons((b) => ({ ...b, [q.id]: q.reponse?.texte ?? "" }));
                              setEnEdition(q.id);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" /> {t("oustaz.modifierReponse")}
                          </Button>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>
                </Card>
              </ElementAnime>
            );
          })}
        </ListeAnimee>
      ) : (
        <Vide icone={MessageCircleQuestion} titre={onglet === "en_attente" ? t("admin.aucuneQuestionEnAttente") : t("oustaz.aucuneRepondue")} />
      )}
    </AppShell>
  );
}
