import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, type Parametres } from "@/lib/api";

/** Photo du Guide fournie avec le site (remplaçable dans « Paramètres du site »). */
export const PHOTO_GUIDE_PAR_DEFAUT = "/guide.jpg";

const PAR_DEFAUT: Parametres = {
  nom_dahira: "Dahira Cheikh Abdoulahi Seye",
  sigle: "FDCAS",
  logo: null,
  nom_guide: "Cheikh Abdoulahi Seye",
  titre_guide: "",
  photo_guide: null,
  biographie_parcours: "",
  biographie_vision: "",
  biographie_enseignements: "",
  citation_du_jour: "",
  citation_auteur: "",
  telephone_contact: "",
  email_contact: "",
  adresse: "",
  montant_cotisation: "1000",
  numero_wave: "",
  numero_orange_money: "",
  video_guide: null,
  video_guide_lien: "",
  video_guide_titre: "",
  video_guide_accueil: false,
  lien_tiktok: "https://www.tiktok.com/@dcas_officiel",
  lien_whatsapp: "https://whatsapp.com/channel/0029VbEGug0Ae5Vz74Gb8B0j",
  lien_telegram: "https://t.me/dahira_cheikh_abdoulaye_seye",
  lien_facebook: "https://www.facebook.com/share/1UtYp8t6y7/",
  lien_instagram: "https://www.instagram.com/dahira_cheikh_abdoulaye_seye_o",
  lien_youtube: "https://youtube.com/@dahiracheikhabdoulayeseyeoffic",
};

interface ParametresContextValue {
  parametres: Parametres;
  recharger: () => Promise<void>;
  remplacer: (p: Parametres) => void;
}

const ParametresContext = createContext<ParametresContextValue | undefined>(undefined);

export function ParametresProvider({ children }: { children: ReactNode }) {
  const [parametres, setParametres] = useState<Parametres>(PAR_DEFAUT);

  const recharger = useCallback(async () => {
    try {
      const { data } = await api.get<Parametres>("/site/parametres/");
      setParametres(data);
    } catch {
      /* hors ligne : on garde les valeurs par défaut */
    }
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger]);

  useEffect(() => {
    document.title = parametres.nom_dahira;
  }, [parametres.nom_dahira]);

  return (
    <ParametresContext.Provider value={{ parametres, recharger, remplacer: setParametres }}>
      {children}
    </ParametresContext.Provider>
  );
}

export function useParametres() {
  const ctx = useContext(ParametresContext);
  if (!ctx) throw new Error("useParametres doit être utilisé dans <ParametresProvider>");
  return ctx;
}
