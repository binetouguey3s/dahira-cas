import { AnimatePresence, motion } from "motion/react";
import { Lock, MessageCircleQuestion, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { ajouterVocal, EnregistreurVocal, type Vocal } from "@/components/metier/EnregistreurVocal";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { ElementAnime, EnTete, ListeAnimee, Onglets, SqueletteListe, Vide } from "@/components/ui/Divers";
import { Champ, Select, Textarea } from "@/components/ui/Input";
import { Confirmation, Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { Traduit } from "@/context/TraductionContext";
import { api, messageErreur, toutesLesPages, type Question, type ThemeQuestion } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const THEMES: ThemeQuestion[] = ["jeune_ramadan", "zakat", "vie_dahira", "autre"];

export default function QuestionsReponses() {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [filtre, setFiltre] = useState<"toutes" | "en_attente" | "repondu">("toutes");
  const [edition, setEdition] = useState<Question | "nouvelle" | null>(null);
  const [texte, setTexte] = useState("");
  const [theme, setTheme] = useState<ThemeQuestion>("autre");
  const [envoi, setEnvoi] = useState(false);
  const [vocal, setVocal] = useState<Vocal | null>(null);
  const [aSupprimer, setASupprimer] = useState<Question | null>(null);

  const charger = () =>
    toutesLesPages<Question>("/questions-reponses/questions/?miennes=1&ordering=-date_creation")
      .then(setQuestions)
      .catch(() => setQuestions([]));

  useEffect(() => {
    charger();
  }, []);

  const ouvrir = (q: Question | "nouvelle") => {
    setEdition(q);
    setTexte(q === "nouvelle" ? "" : q.texte);
    setVocal(null);
    setTheme(q === "nouvelle" ? "autre" : q.theme);
  };

  const audioExistant = edition && edition !== "nouvelle" ? edition.audio : null;
  const valide = !!texte.trim() || !!vocal || !!audioExistant;

  const enregistrer = async () => {
    if (!valide || !edition) return;
    setEnvoi(true);
    const donnees = new FormData();
    donnees.append("texte", texte.trim());
    donnees.append("theme", theme);
    ajouterVocal(donnees, vocal);
    try {
      if (edition === "nouvelle") {
        await api.post("/questions-reponses/questions/", donnees);
        notifier(t("questionsReponses.envoyee"));
      } else {
        await api.patch(`/questions-reponses/questions/${edition.id}/`, donnees);
        notifier(t("commun.enregistre"));
      }
      setVocal(null);
      setEdition(null);
      charger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setEnvoi(true);
    try {
      await api.delete(`/questions-reponses/questions/${aSupprimer.id}/`);
      setQuestions((qs) => qs?.filter((q) => q.id !== aSupprimer.id) ?? null);
      notifier(t("commun.supprime"));
      setASupprimer(null);
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const visibles = (questions ?? []).filter((q) => filtre === "toutes" || q.statut === filtre);
  const nbAttente = (questions ?? []).filter((q) => q.statut === "en_attente").length;

  return (
    <AppShell>
      <EnTete
        surTitre={t("questionsReponses.surTitre")}
        titre={t("nav.questionsReponses")}
        sousTitre={t("questionsReponses.sousTitre")}
        action={
          <Button onClick={() => ouvrir("nouvelle")}>
            <Plus className="h-4 w-4" /> {t("questionsReponses.poserUneQuestion")}
          </Button>
        }
      />

      <p className="mb-5 flex items-center gap-2 rounded-xl bg-bg-secondary/70 px-4 py-3 text-xs text-text-secondary">
        <Lock className="h-4 w-4 shrink-0 text-accent-primary" /> {t("questionsReponses.confidentialite")}
      </p>

      <Onglets
        className="mb-6 max-w-md"
        valeur={filtre}
        onChange={setFiltre}
        options={[
          { id: "toutes", label: t("questionsReponses.toutes") },
          { id: "en_attente", label: t("questionsReponses.enAttente"), compteur: nbAttente },
          { id: "repondu", label: t("questionsReponses.repondues") },
        ]}
      />

      {questions === null ? (
        <SqueletteListe />
      ) : visibles.length ? (
        <ListeAnimee key={filtre} className="flex flex-col gap-4">
          {visibles.map((q) => (
            <ElementAnime key={q.id}>
              <Card className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="or">{t(`questionsReponses.themes.${q.theme}`)}</Badge>
                    <span className="text-xs text-text-secondary">{formatDate(q.date_creation)}</span>
                  </div>
                  <Badge tone={q.reponse ? "success" : "warning"}>
                    {q.reponse ? t("questionsReponses.repondue") : t("questionsReponses.enAttente")}
                  </Badge>
                </div>
                {q.texte && <p className="whitespace-pre-line text-text-primary">{q.texte}</p>}
                {q.audio && <audio controls preload="metadata" className="mt-2 h-10 w-full" src={q.audio} />}

                {q.reponse ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-2xl bg-accent-soft p-4"
                  >
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent-primary">
                      <MessageCircleQuestion className="h-3.5 w-3.5" /> {t("questionsReponses.reponseOustaz")}
                    </p>
                    {q.reponse.texte && (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
                        <Traduit texte={q.reponse.texte} />
                      </p>
                    )}
                    {q.reponse.audio && <audio controls preload="metadata" className="mt-3 h-10 w-full" src={q.reponse.audio} />}
                  </motion.div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => ouvrir(q)}>
                      <Pencil className="h-3.5 w-3.5" /> {t("commun.modifier")}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-status-error" onClick={() => setASupprimer(q)}>
                      <Trash2 className="h-3.5 w-3.5" /> {t("commun.supprimer")}
                    </Button>
                  </div>
                )}
              </Card>
            </ElementAnime>
          ))}
        </ListeAnimee>
      ) : (
        <Vide
          icone={MessageCircleQuestion}
          titre={t("questionsReponses.aucuneQuestion")}
          message={t("questionsReponses.aucuneQuestionAide")}
          action={
            <Button onClick={() => ouvrir("nouvelle")}>
              <Plus className="h-4 w-4" /> {t("questionsReponses.poserUneQuestion")}
            </Button>
          }
        />
      )}

      <Modal
        ouvert={edition !== null}
        onFermer={() => setEdition(null)}
        titre={edition === "nouvelle" ? t("questionsReponses.poserUneQuestion") : t("questionsReponses.modifierQuestion")}
        description={t("questionsReponses.aideFormulaire")}
        pied={
          <>
            <Button variant="outline" onClick={() => setEdition(null)}>
              {t("commun.annuler")}
            </Button>
            <Button onClick={enregistrer} chargement={envoi} disabled={!valide}>
              {edition === "nouvelle" ? t("commun.envoyer") : t("commun.enregistrer")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Champ label={t("questionsReponses.theme")}>
            {(id) => (
              <Select id={id} value={theme} onChange={(e) => setTheme(e.target.value as ThemeQuestion)}>
                {THEMES.map((th) => (
                  <option key={th} value={th}>
                    {t(`questionsReponses.themes.${th}`)}
                  </option>
                ))}
              </Select>
            )}
          </Champ>
          <Champ label={t("questionsReponses.votreQuestion")}>
            {(id) => (
              <Textarea
                id={id}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                rows={4}
                maxLength={3000}
                placeholder={t("questionsReponses.placeholder")}
              />
            )}
          </Champ>
          <div>
            <p className="mb-2 text-sm font-semibold text-text-primary">
              {t("vocal.ouVocal")} <span className="font-normal text-text-secondary">{t("commun.optionnel")}</span>
            </p>
            {audioExistant && !vocal && <audio controls preload="metadata" className="mb-2 h-10 w-full" src={audioExistant} />}
            <EnregistreurVocal vocal={vocal} onChange={setVocal} />
          </div>
          <AnimatePresence>
            {texte.length > 2500 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-end text-xs text-text-secondary">
                {texte.length}/3000
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </Modal>

      <Confirmation
        ouvert={!!aSupprimer}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        titre={t("questionsReponses.supprimerTitre")}
        message={t("questionsReponses.supprimerMessage")}
        libelleConfirmer={t("commun.supprimer")}
        chargement={envoi}
      />
    </AppShell>
  );
}
