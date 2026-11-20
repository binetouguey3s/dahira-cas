import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { changerLangue, LANGUES, type Langue } from "@/i18n";
import { api, jetons, type Membre } from "@/lib/api";

interface DonneesInscription {
  nom_complet: string;
  telephone: string;
  telephone_confirmation?: string;
  email?: string;
  password: string;
  langue_preferee?: Langue;
}

interface AuthContextValue {
  membre: Membre | null;
  chargement: boolean;
  connecter: (telephone: string, motDePasse: string) => Promise<Membre | null>;
  inscrire: (donnees: DonneesInscription) => Promise<void>;
  deconnecter: () => void;
  /** Met à jour le profil côté serveur (JSON ou FormData pour la photo). */
  mettreAJour: (donnees: Partial<Membre> | FormData) => Promise<Membre>;
  remplacer: (membre: Membre) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function appliquerLanguePreferee(membre: Membre) {
  try {
    // La langue choisie sur cet appareil reste prioritaire si elle existe déjà.
    if (localStorage.getItem("dahira_langue")) return;
  } catch {
    /* ignore */
  }
  if ((LANGUES as readonly string[]).includes(membre.langue_preferee)) changerLangue(membre.langue_preferee as Langue);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [membre, setMembre] = useState<Membre | null>(null);
  const [chargement, setChargement] = useState(true);

  const chargerProfil = useCallback(async (): Promise<Membre | null> => {
    if (!jetons.acces()) {
      setChargement(false);
      return null;
    }
    try {
      const { data } = await api.get<Membre>("/comptes/moi/");
      setMembre(data);
      return data;
    } catch {
      jetons.effacer();
      setMembre(null);
      return null;
    } finally {
      setChargement(false);
    }
  }, []);

  // Quand on revient sur l'onglet, le profil (rôle, photo…) est remis à jour sans recharger la page.
  useEffect(() => {
    let dernier = Date.now();
    const rafraichir = () => {
      if (document.visibilityState !== "visible" || !jetons.acces() || Date.now() - dernier < 30_000) return;
      dernier = Date.now();
      api
        .get<Membre>("/comptes/moi/")
        .then(({ data }) => setMembre(data))
        .catch(() => {
          /* hors ligne : on garde le profil affiché */
        });
    };
    document.addEventListener("visibilitychange", rafraichir);
    window.addEventListener("focus", rafraichir);
    return () => {
      document.removeEventListener("visibilitychange", rafraichir);
      window.removeEventListener("focus", rafraichir);
    };
  }, []);

  useEffect(() => {
    chargerProfil();
    const surDeconnexion = () => setMembre(null);
    window.addEventListener("dahira:deconnexion", surDeconnexion);
    return () => window.removeEventListener("dahira:deconnexion", surDeconnexion);
  }, [chargerProfil]);

  const connecter = async (telephone: string, motDePasse: string) => {
    const { data } = await api.post("/comptes/connexion/", {
      username: telephone.replace(/\s+/g, ""),
      password: motDePasse,
    });
    jetons.enregistrer(data.access, data.refresh);
    const profil = await chargerProfil();
    if (profil) appliquerLanguePreferee(profil);
    return profil;
  };

  const inscrire = async (donnees: DonneesInscription) => {
    const { data } = await api.post("/comptes/inscription/", {
      ...donnees,
      telephone: donnees.telephone.replace(/\s+/g, ""),
    });
    jetons.enregistrer(data.access, data.refresh);
    setMembre(data.membre);
  };

  const deconnecter = () => {
    jetons.effacer();
    setMembre(null);
  };

  const mettreAJour = async (donnees: Partial<Membre> | FormData) => {
    const { data } = await api.patch<Membre>("/comptes/moi/", donnees);
    setMembre(data);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{ membre, chargement, connecter, inscrire, deconnecter, mettreAJour, remplacer: setMembre }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
