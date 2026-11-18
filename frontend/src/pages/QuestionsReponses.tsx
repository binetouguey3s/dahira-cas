import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircleQuestion } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { TopBarControls } from "@/components/layout/TopBarControls";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Textarea } from "@/components/ui/Input";
import { api, type Paginated, type Question } from "@/lib/api";

const THEMES = ["jeune_ramadan", "zakat", "vie_dahira", "autre"] as const;

export default function QuestionsReponses() {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [texte, setTexte] = useState("");
  const [theme, setTheme] = useState<string>("autre");
  const [envoi, setEnvoi] = useState(false);

  const charger = () => {
    api.get<Paginated<Question>>("/questions-reponses/questions/").then((res) =>
      setQuestions(res.data.results),
    );
  };

  useEffect(() => {
    charger();
  }, []);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      await api.post("/questions-reponses/questions/", { texte, theme });
      setTexte("");
      setAfficherFormulaire(false);
      charger();
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">{t("nav.questionsReponses")}</h1>
        <TopBarControls />
      </div>

      <Button onClick={() => setAfficherFormulaire((v) => !v)} className="mb-5 w-full">
        {t("questionsReponses.poserUneQuestion")}
      </Button>

      {afficherFormulaire && (
        <Card className="mb-5">
          <form onSubmit={soumettre} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="theme">{t("questionsReponses.theme")}</Label>
              <select
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 text-text-primary"
              >
                {THEMES.map((th) => (
                  <option key={th} value={th}>
                    {t(`questionsReponses.themes.${th}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="texte">{t("questionsReponses.contenu")}</Label>
              <Textarea id="texte" value={texte} onChange={(e) => setTexte(e.target.value)} rows={4} required />
            </div>
            <Button type="submit" disabled={envoi}>
              {t("questionsReponses.envoyer")}
            </Button>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {questions.map((q) => (
          <Card key={q.id}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-semibold text-text-primary">{t(`questionsReponses.themes.${q.theme}`)}</p>
              <Badge tone={q.reponse ? "success" : "warning"}>
                {q.reponse ? t("questionsReponses.repondue") : t("questionsReponses.enAttente")}
              </Badge>
            </div>
            <p className="mb-2 text-sm text-text-secondary">{q.texte}</p>
            {q.reponse && (
              <div className="rounded-lg bg-accent-soft p-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-accent-primary">
                  <MessageCircleQuestion className="h-3 w-3" /> {t("questionsReponses.reponseGuide")}
                </p>
                <p className="text-sm text-text-primary">{q.reponse.texte}</p>
              </div>
            )}
          </Card>
        ))}
        {questions.length === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">{t("questionsReponses.aucuneQuestion")}</p>
        )}
      </div>
    </AppShell>
  );
}
