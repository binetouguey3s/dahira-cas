import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Heart, Share2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { api, type ContenuMedia } from "@/lib/api";

export default function MediaDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [contenu, setContenu] = useState<ContenuMedia | null>(null);
  const [question, setQuestion] = useState("");
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<ContenuMedia>(`/mediatheque/contenus/${id}/`).then((res) => setContenu(res.data));
  }, [id]);

  const aimer = () => {
    if (!id) return;
    api
      .post<{ nb_likes: number }>(`/mediatheque/contenus/${id}/aimer/`)
      .then((res) => setContenu((c) => (c ? { ...c, nb_likes: res.data.nb_likes } : c)));
  };

  const telecharger = () => {
    if (!id || !contenu) return;
    api
      .post<{ nb_telechargements: number }>(`/mediatheque/contenus/${id}/telecharger/`)
      .then((res) => setContenu((c) => (c ? { ...c, nb_telechargements: res.data.nb_telechargements } : c)));
    const lien = contenu.fichier || contenu.url_externe;
    if (lien) window.open(lien, "_blank");
  };

  const poserQuestion = async () => {
    if (!question.trim() || !id) return;
    await api.post("/questions-reponses/questions/", {
      theme: "autre",
      texte: `[${contenu?.titre ?? ""}] ${question}`,
    });
    setEnvoye(true);
    setQuestion("");
  };

  if (!contenu) return <AppShell><p className="text-text-secondary">{t("commun.chargement")}</p></AppShell>;

  return (
    <AppShell>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-text-secondary">
        <ArrowLeft className="h-4 w-4" /> {t("commun.retour")}
      </button>

      <h1 className="mb-2 text-xl font-bold text-text-primary">{contenu.titre}</h1>
      <p className="mb-5 leading-relaxed text-text-secondary">{contenu.description}</p>

      {contenu.type === "video" && contenu.url_externe && (
        <div className="mb-5 aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            className="h-full w-full"
            src={contenu.url_externe}
            title={contenu.titre}
            allowFullScreen
          />
        </div>
      )}
      {contenu.type === "audio" && (
        <Card className="mb-5 flex items-center gap-4">
          <audio controls className="w-full" src={contenu.fichier || contenu.url_externe} />
        </Card>
      )}
      {contenu.type === "texte" && (
        <Card className="mb-5 whitespace-pre-line leading-relaxed text-text-primary">
          {contenu.description}
        </Card>
      )}

      <div className="mb-6 flex gap-3">
        <Button variant="outline" onClick={aimer} className="flex-1 gap-2">
          <Heart className="h-4 w-4" /> {contenu.nb_likes}
        </Button>
        <Button variant="outline" onClick={telecharger} className="flex-1 gap-2">
          <Download className="h-4 w-4" /> {t("mediatheque.telecharger")}
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() =>
            navigator.share
              ? navigator.share({ title: contenu.titre, url: window.location.href })
              : navigator.clipboard.writeText(window.location.href)
          }
        >
          <Share2 className="h-4 w-4" /> {t("mediatheque.partager")}
        </Button>
      </div>

      <Card>
        <h3 className="mb-2 font-semibold text-text-primary">{t("mediatheque.poserQuestion")}</h3>
        {envoye ? (
          <p className="text-sm text-status-success">{t("mediatheque.questionEnvoyee")}</p>
        ) : (
          <>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("mediatheque.placeholderQuestion")}
              rows={3}
            />
            <Button onClick={poserQuestion} className="mt-3 w-full">
              {t("mediatheque.envoyer")}
            </Button>
          </>
        )}
      </Card>
    </AppShell>
  );
}
