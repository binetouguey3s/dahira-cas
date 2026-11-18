import { motion } from "motion/react";
import { BadgeCheck, MapPin, Phone, ShieldX } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Controles } from "@/components/layout/Controles";
import { Logo } from "@/components/layout/Logo";
import { Avatar } from "@/components/ui/Divers";
import { useParametres } from "@/context/ParametresContext";
import { api, type CarteVerification } from "@/lib/api";

export default function VerifierCarte() {
  const { t } = useTranslation();
  const { numero } = useParams();
  const { parametres } = useParametres();
  const [carte, setCarte] = useState<CarteVerification | null>(null);
  const [etat, setEtat] = useState<"chargement" | "ok" | "inconnue">("chargement");

  useEffect(() => {
    api
      .get<CarteVerification>(`/comptes/carte/${encodeURIComponent(numero ?? "")}/`)
      .then((res) => {
        setCarte(res.data);
        setEtat("ok");
      })
      .catch(() => setEtat("inconnue"));
  }, [numero]);

  const valide = etat === "ok";

  return (
    <div className="flex min-h-dvh flex-col items-center bg-bg-primary px-4 py-6">
      <div className="mb-8 flex w-full max-w-md items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo taille={36} />
          <span className="text-sm font-bold text-text-primary">{parametres.nom_dahira}</span>
        </Link>
        <Controles />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-border-subtle bg-bg-elevated shadow-xl"
      >
        <div
          className={`flex flex-col items-center gap-2 px-6 py-8 text-center text-white ${
            etat === "chargement" ? "bg-border-default" : valide ? "bg-gradient-to-br from-[#1E7A5D] to-[#0B3D2E]" : "bg-gradient-to-br from-[#c0392b] to-[#7d241b]"
          }`}
        >
          {etat === "chargement" ? (
            <div className="h-14 w-14 animate-pulse rounded-full bg-white/30" />
          ) : (
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}>
              {valide ? <BadgeCheck className="h-14 w-14" /> : <ShieldX className="h-14 w-14" />}
            </motion.div>
          )}
          <p className="text-xl font-bold">
            {etat === "chargement" ? t("commun.chargement") : valide ? t("verification.valide") : t("verification.inconnue")}
          </p>
          <p className="text-sm text-white/80">{numero}</p>
        </div>

        {carte && (
          <div className="p-6">
            <div className="flex items-center gap-4">
              <Avatar nom={carte.nom_complet} photo={carte.photo} taille={72} />
              <div className="min-w-0">
                <p className="text-lg font-bold text-text-primary">{carte.nom_complet}</p>
                <p className="text-sm text-text-secondary">{carte.carte_numero}</p>
              </div>
            </div>
            {(carte.telephone || carte.adresse) && (
              <div className="mt-5 flex flex-col gap-2 border-t border-border-subtle pt-4 text-sm text-text-primary">
                {carte.telephone && (
                  <a href={`tel:${carte.telephone}`} className="flex items-center gap-2.5 hover:text-accent-primary">
                    <Phone className="h-4 w-4 text-accent-primary" /> {carte.telephone}
                  </a>
                )}
                {carte.adresse && (
                  <p className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-accent-primary" /> {carte.adresse}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {etat === "inconnue" && <p className="p-6 text-center text-sm text-text-secondary">{t("verification.inconnueAide")}</p>}
      </motion.div>
    </div>
  );
}
