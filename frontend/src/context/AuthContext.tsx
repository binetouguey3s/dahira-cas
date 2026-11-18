import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api, type Membre } from "@/lib/api";

interface AuthContextValue {
  membre: Membre | null;
  chargement: boolean;
  connecter: (telephone: string, motDePasse: string) => Promise<void>;
  inscrire: (donnees: {
    nom_complet: string;
    telephone: string;
    email?: string;
    password: string;
  }) => Promise<void>;
  deconnecter: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [membre, setMembre] = useState<Membre | null>(null);
  const [chargement, setChargement] = useState(true);

  const chargerProfil = async () => {
    const token = localStorage.getItem("dahira_access_token");
    if (!token) {
      setChargement(false);
      return;
    }
    try {
      const { data } = await api.get<Membre>("/comptes/moi/");
      setMembre(data);
    } catch {
      localStorage.removeItem("dahira_access_token");
      localStorage.removeItem("dahira_refresh_token");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerProfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connecter = async (telephone: string, motDePasse: string) => {
    const { data } = await api.post("/comptes/connexion/", {
      username: telephone,
      password: motDePasse,
    });
    localStorage.setItem("dahira_access_token", data.access);
    localStorage.setItem("dahira_refresh_token", data.refresh);
    await chargerProfil();
  };

  const inscrire = async (donnees: {
    nom_complet: string;
    telephone: string;
    email?: string;
    password: string;
  }) => {
    const { data } = await api.post("/comptes/inscription/", donnees);
    localStorage.setItem("dahira_access_token", data.access);
    localStorage.setItem("dahira_refresh_token", data.refresh);
    setMembre(data.membre);
  };

  const deconnecter = () => {
    localStorage.removeItem("dahira_access_token");
    localStorage.removeItem("dahira_refresh_token");
    setMembre(null);
  };

  return (
    <AuthContext.Provider
      value={{ membre, chargement, connecter, inscrire, deconnecter }}
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
