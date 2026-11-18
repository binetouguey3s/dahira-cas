import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Champ, Input, Select } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { LANGUES, NOMS_LANGUES } from "@/i18n";
import { messageErreur, type Membre } from "@/lib/api";
import type { ChampCarte } from "@/lib/carte";

const PAYS = [
  "Sénégal", "Gambie", "Mali", "Mauritanie", "Guinée", "Guinée-Bissau", "Côte d'Ivoire", "Burkina Faso",
  "France", "Italie", "Espagne", "Belgique", "Allemagne", "Royaume-Uni", "États-Unis", "Canada",
  "Maroc", "Gabon", "Cameroun", "Congo", "Autre",
];

type Champs = Pick<Membre, "nom_complet" | "telephone" | "email" | "profession" | "adresse" | "pays" | "langue_preferee">;

/** Formulaire des informations personnelles. `seulement` limite aux champs manquants (assistant de carte). */
export function FormulaireProfil({
  seulement,
  onEnregistre,
  libelleBouton,
}: {
  seulement?: ChampCarte[];
  onEnregistre?: (m: Membre) => void;
  libelleBouton?: string;
}) {
  const { t } = useTranslation();
  const { membre, mettreAJour } = useAuth();
  const { notifier } = useToast();
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [valeurs, setValeurs] = useState<Champs>(() => ({
    nom_complet: membre?.nom_complet ?? "",
    telephone: membre?.telephone ?? "",
    email: membre?.email ?? "",
    profession: membre?.profession ?? "",
    adresse: membre?.adresse ?? "",
    pays: membre?.pays || "Sénégal",
    langue_preferee: membre?.langue_preferee ?? "fr",
  }));

  if (!membre) return null;
  const visible = (c: string) => !seulement || (seulement as readonly string[]).includes(c);
  const maj = (c: keyof Champs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValeurs((v) => ({ ...v, [c]: e.target.value }));

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    setErreurs({});
    const donnees: Record<string, string | null> = {};
    (Object.keys(valeurs) as (keyof Champs)[]).forEach((c) => {
      if (visible(c) || !seulement) donnees[c] = valeurs[c].trim?.() ?? valeurs[c];
    });
    if ("telephone" in donnees && donnees.telephone) donnees.telephone = donnees.telephone.replace(/\s+/g, "");
    try {
      const m = await mettreAJour(donnees as Partial<Membre>);
      notifier(t("commun.enregistre"));
      onEnregistre?.(m);
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      if (data && typeof data === "object") {
        setErreurs(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)])));
      }
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="grid gap-4 sm:grid-cols-2">
      {visible("nom_complet") && (
        <Champ label={t("champs.nomComplet")} erreur={erreurs.nom_complet} className="sm:col-span-2">
          {(id) => <Input id={id} value={valeurs.nom_complet} onChange={maj("nom_complet")} autoComplete="name" required />}
        </Champ>
      )}
      {visible("telephone") && (
        <Champ label={t("champs.telephone")} erreur={erreurs.telephone} aide={!seulement ? t("profil.aideTelephone") : undefined}>
          {(id) => <Input id={id} type="tel" value={valeurs.telephone} onChange={maj("telephone")} required />}
        </Champ>
      )}
      {visible("email") && !seulement && (
        <Champ label={t("champs.email")} optionnel={t("commun.optionnel")} erreur={erreurs.email}>
          {(id) => <Input id={id} type="email" value={valeurs.email} onChange={maj("email")} autoComplete="email" />}
        </Champ>
      )}
      {visible("profession") && !seulement && (
        <Champ label={t("champs.profession")} optionnel={t("commun.optionnel")}>
          {(id) => <Input id={id} value={valeurs.profession} onChange={maj("profession")} />}
        </Champ>
      )}
      {visible("adresse") && (
        <Champ label={t("champs.adresse")} optionnel={t("commun.optionnel")} aide={t("profil.aideAdresse")} erreur={erreurs.adresse}>
          {(id) => (
            <Input
              id={id}
              value={valeurs.adresse}
              onChange={maj("adresse")}
              autoComplete="street-address"
              placeholder="Médina, Dakar"
            />
          )}
        </Champ>
      )}
      {visible("pays") && (
        <Champ label={t("champs.pays")}>
          {(id) => (
            <Select id={id} value={valeurs.pays} onChange={maj("pays")}>
              {[...new Set([valeurs.pays, ...PAYS])].filter(Boolean).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          )}
        </Champ>
      )}
      {!seulement && (
        <Champ label={t("champs.langue")}>
          {(id) => (
            <Select id={id} value={valeurs.langue_preferee} onChange={maj("langue_preferee")}>
              {LANGUES.map((l) => (
                <option key={l} value={l}>
                  {NOMS_LANGUES[l].nom}
                </option>
              ))}
            </Select>
          )}
        </Champ>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" chargement={envoi} className="w-full sm:w-auto">
          {libelleBouton ?? t("commun.enregistrer")}
        </Button>
      </div>
    </form>
  );
}
