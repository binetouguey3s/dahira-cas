import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { TopBarControls } from "@/components/layout/TopBarControls";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

export default function Inscription() {
  const { t } = useTranslation();
  const { inscrire } = useAuth();
  const navigate = useNavigate();

  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      await inscrire({ nom_complet: nomComplet, telephone, email, password: motDePasse });
      navigate("/");
    } catch {
      setErreur("Inscription impossible — vérifiez vos informations.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary md:flex-row">
      <div className="flex flex-col justify-center gap-4 bg-gradient-to-br from-[#0B3D2E] to-[#1E7A5D] p-10 text-white md:w-1/2">
        <div className="h-16 w-16 rounded-lg bg-white/10" />
        <h1 className="max-w-sm text-3xl font-bold">Dahira Cheikh Abdoulahi Seye</h1>
        <p className="max-w-sm text-sm text-white/85">{t("inscription.sousTitre")}</p>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="absolute right-4 top-4">
          <TopBarControls />
        </div>
        <form onSubmit={soumettre} className="flex w-full max-w-sm flex-col gap-4">
          <h2 className="text-xl font-bold text-text-primary">{t("inscription.titre")}</h2>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nom">{t("inscription.nomComplet")}</Label>
            <Input id="nom" value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telephone">{t("inscription.telephone")}</Label>
            <Input
              id="telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+221 77 123 45 67"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">
              {t("inscription.email")} <span className="font-normal text-text-secondary">{t("inscription.optionnel")}</span>
            </Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mdp">{t("inscription.motDePasse")}</Label>
            <Input
              id="mdp"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {erreur && <p className="text-sm text-status-error">{erreur}</p>}

          <Button type="submit" disabled={envoi} className="mt-2 w-full">
            {t("inscription.bouton")}
          </Button>

          <p className="text-center text-sm text-text-secondary">
            {t("inscription.dejaMembre")}{" "}
            <Link to="/connexion" className="font-semibold text-accent-primary">
              {t("inscription.seConnecter")}
            </Link>
          </p>
          <Link to="/" className="text-center text-xs font-semibold text-text-secondary underline">
            {t("inscription.continuerSansCompte")}
          </Link>
        </form>
      </div>
    </div>
  );
}
