import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { api, type Evenement, type Paginated } from "@/lib/api";

const CATEGORIES = ["magal", "gamou", "dahira", "causerie", "autre"] as const;

export default function EvenementAdmin() {
  const { t } = useTranslation();
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [lieu, setLieu] = useState("");
  const [date, setDate] = useState("");
  const [categorie, setCategorie] = useState<string>("autre");
  const [busActif, setBusActif] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const charger = () => {
    api.get<Paginated<Evenement>>("/evenements/evenements/?ordering=-date").then((res) => setEvenements(res.data.results));
  };

  useEffect(() => {
    charger();
  }, []);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      await api.post("/evenements/evenements/", {
        titre,
        description,
        lieu,
        date,
        categorie,
        reservation_bus_active: busActif,
      });
      setTitre("");
      setDescription("");
      setLieu("");
      setDate("");
      setBusActif(false);
      charger();
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AppShell>
      <Link to="/admin" className="mb-4 flex items-center gap-1 text-sm text-text-secondary">
        <ArrowLeft className="h-4 w-4" /> {t("commun.retour")}
      </Link>
      <h1 className="mb-6 text-xl font-bold text-text-primary">{t("admin.evenements")}</h1>

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-text-primary">{t("admin.nouvelEvenement")}</h2>
        <form onSubmit={soumettre} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="titre">{t("questionsReponses.titre")}</Label>
            <Input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">{t("evenements.description")}</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lieu">{t("evenements.lieu")}</Label>
              <Input id="lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="date">{t("evenements.date")}</Label>
              <Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="categorie">{t("evenements.categorie")}</Label>
            <select
              id="categorie"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3 text-text-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`evenements.categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={busActif} onChange={(e) => setBusActif(e.target.checked)} />
            {t("admin.activerReservationBus")}
          </label>
          <Button type="submit" disabled={envoi}>
            {t("admin.creer")}
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {evenements.map((ev) => (
          <Card key={ev.id}>
            <p className="font-semibold text-text-primary">{ev.titre}</p>
            <p className="text-sm text-text-secondary">
              {new Date(ev.date).toLocaleString("fr-FR")} — {ev.lieu}
            </p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
