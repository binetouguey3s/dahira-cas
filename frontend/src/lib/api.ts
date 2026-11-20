import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

const CLE_ACCES = "dahira_access_token";
const CLE_RAFRAICHIR = "dahira_refresh_token";

export const jetons = {
  acces: () => localStorage.getItem(CLE_ACCES),
  rafraichir: () => localStorage.getItem(CLE_RAFRAICHIR),
  enregistrer(acces: string, rafraichir?: string) {
    localStorage.setItem(CLE_ACCES, acces);
    if (rafraichir) localStorage.setItem(CLE_RAFRAICHIR, rafraichir);
  },
  effacer() {
    localStorage.removeItem(CLE_ACCES);
    localStorage.removeItem(CLE_RAFRAICHIR);
  },
};

export const api = axios.create({ baseURL: API_BASE_URL });

// Attache le jeton JWT à chaque requête, s'il existe.
api.interceptors.request.use((config) => {
  const token = jetons.acces();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Quand le jeton d'accès expire, on le renouvelle une fois puis on rejoue la requête.
let renouvellement: Promise<string | null> | null = null;

async function renouvelerJeton(): Promise<string | null> {
  const rafraichir = jetons.rafraichir();
  if (!rafraichir) return null;
  try {
    const { data } = await axios.post(`${API_BASE_URL}/comptes/connexion/rafraichir/`, { refresh: rafraichir });
    jetons.enregistrer(data.access, data.refresh);
    return data.access as string;
  } catch {
    jetons.effacer();
    window.dispatchEvent(new Event("dahira:deconnexion"));
    return null;
  }
}

api.interceptors.response.use(
  (reponse) => reponse,
  async (erreur: AxiosError) => {
    const config = erreur.config as (InternalAxiosRequestConfig & { _rejoue?: boolean }) | undefined;
    if (erreur.response?.status === 401 && config && !config._rejoue && jetons.rafraichir()) {
      config._rejoue = true;
      renouvellement ??= renouvelerJeton().finally(() => (renouvellement = null));
      const nouveau = await renouvellement;
      if (nouveau) {
        config.headers.Authorization = `Bearer ${nouveau}`;
        return api(config);
      }
    }
    return Promise.reject(erreur);
  },
);

/** Transforme une erreur de l'API (format Django REST Framework) en message lisible. */
export function messageErreur(erreur: unknown, parDefaut: string): string {
  const reponse = (erreur as AxiosError)?.response;
  if (!reponse) return (erreur as AxiosError)?.message === "Network Error" ? "Connexion au serveur impossible." : parDefaut;
  const data = reponse.data as unknown;
  // Page HTML d'erreur du serveur : on n'affiche jamais le code brut.
  if (typeof data === "string" && data.trimStart().startsWith("<")) {
    return reponse.status >= 500 ? "Le serveur a rencontré un problème. Réessayez dans un instant." : parDefaut;
  }
  const aplatir = (v: unknown): string[] => {
    if (typeof v === "string") return [v];
    if (Array.isArray(v)) return v.flatMap(aplatir);
    if (v && typeof v === "object") return Object.values(v).flatMap(aplatir);
    return [];
  };
  const messages = aplatir(data).filter(Boolean);
  return messages.length ? messages.join(" ") : parDefaut;
}

/** Récupère toutes les pages d'une liste paginée. */
export async function toutesLesPages<T>(url: string): Promise<T[]> {
  const resultats: T[] = [];
  let suivante: string | null = url;
  while (suivante) {
    const { data }: { data: Paginated<T> } = await api.get<Paginated<T>>(suivante);
    resultats.push(...data.results);
    suivante = data.next;
  }
  return resultats;
}

export type Role = "membre" | "responsable_finance" | "oustaz" | "admin_contenus" | "admin_general";
export type CodeLangue = "fr" | "en" | "es" | "ar";

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
  is_staff: boolean;
  langue_preferee: CodeLangue;
  carte_numero: string;
  date_inscription: string;
  /** Gère les bus d'un événement à venir (affiche son « Espace bus »). */
  est_responsable_bus?: boolean;
}

export interface MembreAdmin extends Omit<Membre, "username"> {
  is_active: boolean;
  last_login: string | null;
  nb_cotisations_payees: number;
}

export interface MembreResume {
  id: number;
  nom_complet: string;
  telephone: string;
  carte_numero: string;
  photo: string | null;
}

export interface CarteVerification {
  nom_complet: string;
  carte_numero: string;
  photo: string | null;
  telephone: string;
  adresse: string;
}

export interface Cotisation {
  archive_le?: string | null;
  archive_par_nom?: string;
  id: number;
  membre: number;
  membre_nom: string;
  membre_telephone: string;
  mois: number;
  annee: number;
  montant: string;
  statut: "paye" | "en_retard" | "non_paye";
  moyen_paiement: "wave" | "orange_money" | "autre" | "";
  reference_transaction: string;
  date_paiement: string | null;
}

export interface Bus {
  numero: number;
  places_total: number;
  places_restantes: number | null;
}

export interface ResponsableBus {
  id: number;
  membre: number;
  nom: string;
  telephone: string;
  numero_wave: string;
  numero_orange_money: string;
  accepte_especes: boolean;
}

export interface PassagerBus {
  id?: number;
  nom: string;
  est_titulaire?: boolean;
  bus_numero?: number;
}

export type MoyenPaiementBus = "wave" | "orange_money" | "especes";
export type StatutPaiementBus = "a_verifier" | "valide" | "refuse";
export type StatutReservationBus = "en_attente" | "acceptee" | "acompte" | "payee" | "annulee";

export interface PaiementBus {
  id: number;
  montant: string;
  moyen: MoyenPaiementBus;
  reference: string;
  note: string;
  responsable: number | null;
  responsable_nom: string;
  statut: StatutPaiementBus;
  declare_par_nom: string;
  declare_le: string;
  traite_par_nom: string;
  traite_le: string | null;
}

export interface ReservationBus {
  id: number;
  evenement: number;
  evenement_titre: string;
  membre: number | null;
  titulaire_nom: string;
  titulaire_telephone: string;
  nom_contact: string;
  telephone_contact: string;
  passagers: PassagerBus[];
  paiements: PaiementBus[];
  nb_places: number;
  montant_du: string;
  montant_paye: string;
  montant_a_verifier: string;
  statut: StatutReservationBus;
  acceptee: boolean;
  acceptee_par_nom: string;
  annulee: boolean;
  modifiable: boolean;
  date_reservation: string;
  creee_par_nom?: string;
}

export interface EvenementEspaceBus {
  id: number;
  titre: string;
  date: string;
  lieu: string;
  categorie: CategorieEvenement;
  capacite: number;
  places_occupees: number;
  nb_reservations: number;
  paiements_a_verifier: number;
  en_attente: number;
}

export interface PassagerGestion {
  id: number;
  nom: string;
  est_titulaire: boolean;
  reservation: number;
  titulaire_nom: string;
  titulaire_telephone: string;
  statut: StatutReservationBus;
}

export interface GestionBus {
  evenement: Evenement;
  bus: { numero: number; places_total: number; passagers: PassagerGestion[] }[];
  reservations: ReservationBus[];
  totaux: {
    capacite: number;
    places_occupees: number;
    montant_du: string;
    montant_paye: string;
    montant_a_verifier: string;
    reste_a_payer: string;
  };
}

export type CategorieEvenement = "magal" | "gamou" | "dahira" | "causerie" | "nisfou_shabaan" | "leylatul_khadr" | "autre";

export interface Evenement {
  archive_le?: string | null;
  archive_par_nom?: string;
  id: number;
  titre: string;
  description: string;
  lieu: string;
  categorie: CategorieEvenement;
  date: string;
  reservation_bus_active: boolean;
  nb_bus: number | null;
  places_par_bus: number | null;
  prix_place: string | null;
  bus: Bus[];
  places_restantes: number;
  ma_reservation: ReservationBus | null;
  nb_reservations: number;
  responsables: ResponsableBus[];
  est_responsable: boolean;
}

export type TypeContenu = "audio" | "video" | "texte";

export interface ContenuMedia {
  archive_le?: string | null;
  archive_par_nom?: string;
  id: number;
  titre: string;
  description: string;
  type: TypeContenu;
  fichier: string | null;
  url_externe: string;
  auteur: string;
  categorie: CategorieEvenement | "";
  categorie_autre: string;
  evenement: number | null;
  evenement_titre: string | null;
  nb_likes: number;
  nb_telechargements: number;
  aime: boolean;
  date_publication: string;
}

export type ThemeQuestion = "jeune_ramadan" | "zakat" | "vie_dahira" | "autre";

export interface Question {
  archive_le?: string | null;
  archive_par_nom?: string;
  id: number;
  membre: number;
  membre_nom: string;
  theme: ThemeQuestion;
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

export interface Parametres {
  nom_dahira: string;
  sigle: string;
  logo: string | null;
  nom_guide: string;
  titre_guide: string;
  photo_guide: string | null;
  biographie_parcours: string;
  biographie_vision: string;
  biographie_enseignements: string;
  citation_du_jour: string;
  citation_auteur: string;
  telephone_contact: string;
  email_contact: string;
  adresse: string;
  montant_cotisation: string;
  numero_wave: string;
  numero_orange_money: string;
  video_guide: string | null;
  video_guide_lien: string;
  video_guide_titre: string;
  video_guide_accueil: boolean;
  lien_tiktok: string;
  lien_whatsapp: string;
  lien_telegram: string;
  lien_facebook: string;
  lien_instagram: string;
  lien_youtube: string;
  mots_non_traduits: string;
}

export interface Statistiques {
  membres?: number;
  nouveaux_membres_mois?: number;
  cotisations_mois_payees?: number;
  cotisations_mois_total?: number;
  montant_encaisse_annee?: number | string;
  cotisations_en_retard?: number;
  questions_en_attente?: number;
  contenus?: number;
  evenements_a_venir?: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
