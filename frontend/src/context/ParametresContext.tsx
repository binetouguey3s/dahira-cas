import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, type Parametres } from "@/lib/api";

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
