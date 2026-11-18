import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { api, type Paginated, type Question } from "@/lib/api";

export default function AdminOustaz() {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reponses, setReponses] = useState<Record<number, string>>({});
  const [envoiId, setEnvoiId] = useState<number | null>(null);

  const charger = () => {
    api.get<Paginated<Question>>("/questions-reponses/questions/").then((res) => setQuestions(res.data.results));
  };

  useEffect(() => {
    charger();
  }, []);

  const repondre = async (id: number) => {
    const texte = reponses[id];
    if (!texte?.trim()) return;
    setEnvoiId(id);
    try {
      await api.post(`/questions-reponses/questions/${id}/repondre/`, { texte });
      charger();
    } finally {
      setEnvoiId(null);
    }
  };

  const enAttente = questions.filter((q) => !q.reponse);
  const repondues = questions.filter((q) => q.reponse);

  return (
    <AppShell>
      <Link to="/admin" className="mb-4 flex items-center gap-1 text-sm text-text-secondary">
        <ArrowLeft className="h-4 w-4" /> {t("commun.retour")}
      </Link>
      <h1 className="mb-6 text-xl font-bold text-text-primary">{t("admin.questionsEnAttente")}</h1>

      <div className="mb-6 flex flex-col gap-3">
        {enAttente.map((q) => (
          <Card key={q.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-semibold text-text-primary">{q.membre_nom}</p>
              <Badge tone="neutral">{t(`questionsReponses.themes.${q.theme}`)}</Badge>
            </div>
            <p className="mb-3 text-sm text-text-secondary">{q.texte}</p>
            <Textarea
              value={reponses[q.id] ?? ""}
              onChange={(e) => setReponses((r) => ({ ...r, [q.id]: e.target.value }))}
              placeholder={t("admin.redigerReponse")}
              rows={3}
            />
            <Button onClick={() => repondre(q.id)} disabled={envoiId === q.id} className="mt-2 w-full">
              {t("admin.repondre")}
            </Button>
          </Card>
        ))}
        {enAttente.length === 0 && (
          <p className="py-4 text-center text-sm text-text-secondary">{t("admin.aucuneQuestionEnAttente")}</p>
        )}
      </div>

      <h2 className="mb-3 font-semibold text-text-primary">{t("questionsReponses.repondue")}</h2>
      <div className="flex flex-col gap-3">
        {repondues.map((q) => (
          <Card key={q.id}>
            <p className="font-semibold text-text-primary">{q.membre_nom}</p>
            <p className="mb-2 text-sm text-text-secondary">{q.texte}</p>
            <div className="rounded-lg bg-accent-soft p-3 text-sm text-text-primary">{q.reponse?.texte}</div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
