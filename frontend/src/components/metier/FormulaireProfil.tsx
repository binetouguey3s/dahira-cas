import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Champ, Input, Select } from "@/components/ui/Input";
import { SelecteurPays } from "@/components/ui/SelecteurPays";
import { TelephoneInput } from "@/components/ui/TelephoneInput";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { LANGUES, NOMS_LANGUES } from "@/i18n";
import { messageErreur, type Membre } from "@/lib/api";
import type { ChampCarte } from "@/lib/carte";
import { estCodePays } from "@/lib/pays";

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
    pays: estCodePays(membre?.pays) ? membre!.pays.toUpperCase() : "SN",
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
          {(id) => (
            <TelephoneInput
              id={id}
              valeur={valeurs.telephone}
              onChange={(telephone) => setValeurs((v) => ({ ...v, telephone }))}
              paysParDefaut={valeurs.pays}
              required
            />
          )}
        </Champ>
      )}
      {visible("email") && !seulement && (
        <Champ label={t("champs.email")} optionnel={t("commun.optionnel")} erreur={erreurs.email} aide={t("profil.aideEmail")}>
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
          {(id) => <SelecteurPays id={id} valeur={valeurs.pays} onChange={(pays) => setValeurs((v) => ({ ...v, pays }))} />}
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
