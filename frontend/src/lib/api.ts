import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attache le jeton JWT à chaque requête, s'il existe.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dahira_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type Role =
  | "membre"
  | "responsable_finance"
  | "oustaz"
  | "admin_contenus"
  | "admin_general";

export interface Membre {
  id: number;
  username: string;
  nom_complet: string;
  telephone: string;
  email: string;
  profession: string;
  adresse: string;
  pays: string;
  photo: string | null;
  role: Role;
  langue_preferee: "fr" | "en" | "ar";
  carte_numero: string;
  date_inscription: string;
}

export interface Cotisation {
  id: number;
  membre: number;
  membre_nom: string;
  mois: number;
  annee: number;
  montant: string;
  statut: "paye" | "en_retard" | "non_paye";
  moyen_paiement: "wave" | "orange_money" | "autre" | "";
  reference_transaction: string;
  date_paiement: string | null;
}

export interface Evenement {
  id: number;
  titre: string;
  description: string;
  lieu: string;
  categorie: "magal" | "gamou" | "dahira" | "causerie" | "autre";
  date: string;
  reservation_bus_active: boolean;
  nb_bus: number | null;
  places_par_bus: number | null;
}

export interface ContenuMedia {
  id: number;
  titre: string;
  description: string;
  type: "audio" | "video" | "texte";
  fichier: string | null;
  url_externe: string;
  auteur: string;
  evenement: number | null;
  nb_likes: number;
  nb_telechargements: number;
  date_publication: string;
}

export interface Question {
  id: number;
  membre: number;
  membre_nom: string;
  theme: "jeune_ramadan" | "zakat" | "vie_dahira" | "autre";
  texte: string;
  audio: string | null;
  statut: "en_attente" | "repondu";
  date_creation: string;
  reponse: {
    id: number;
    texte: string;
    audio: string | null;
    date_publication: string;
  } | null;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type { Paginated };
