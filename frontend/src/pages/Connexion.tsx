import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { TopBarControls } from "@/components/layout/TopBarControls";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

export default function Connexion() {
  const { t } = useTranslation();
  const { connecter } = useAuth();
  const navigate = useNavigate();

  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      await connecter(telephone, motDePasse);
      navigate("/");
    } catch {
      setErreur("Numéro ou mot de passe incorrect.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary md:flex-row">
      <div className="flex flex-col justify-center gap-4 bg-gradient-to-br from-[#0B3D2E] to-[#1E7A5D] p-10 text-white md:w-1/2">
        <div className="h-16 w-16 rounded-lg bg-white/10" />
        <h1 className="max-w-sm text-3xl font-bold">Dahira Cheikh Abdoulahi Seye</h1>
        <p className="max-w-sm text-sm text-white/85">{t("connexion.sousTitre")}</p>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="absolute right-4 top-4">
          <TopBarControls />
        </div>
        <form onSubmit={soumettre} className="flex w-full max-w-sm flex-col gap-4">
          <h2 className="text-xl font-bold text-text-primary">{t("connexion.titre")}</h2>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telephone">{t("connexion.telephone")}</Label>
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
            <Label htmlFor="mdp">{t("connexion.motDePasse")}</Label>
            <Input
              id="mdp"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>

          {erreur && <p className="text-sm text-status-error">{erreur}</p>}

          <Button type="submit" disabled={envoi} className="mt-2 w-full">
            {t("connexion.bouton")}
          </Button>

          <p className="text-center text-sm text-text-secondary">
            {t("connexion.pasDeCompte")}{" "}
            <Link to="/inscription" className="font-semibold text-accent-primary">
              {t("connexion.sInscrire")}
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
