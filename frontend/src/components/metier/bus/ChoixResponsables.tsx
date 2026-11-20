import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Avatar } from "@/components/ui/Divers";
import { Input } from "@/components/ui/Input";
import { api, type MembreResume } from "@/lib/api";

export interface ResponsableChoisi {
  id: number;
  nom_complet: string;
  telephone: string;
}

const simplifier = (texte: string) =>
  texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Choix des responsables des bus parmi les membres (recherche par nom ou téléphone). */
export function ChoixResponsables({ valeur, onChange }: { valeur: ResponsableChoisi[]; onChange: (v: ResponsableChoisi[]) => void }) {
  const { t } = useTranslation();
  const [membres, setMembres] = useState<MembreResume[] | null>(null);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    api
      .get<MembreResume[]>("/comptes/annuaire/")
      .then((res) => setMembres(res.data))
      .catch(() => setMembres([]));
  }, []);

  const suggestions = useMemo(() => {
    const q = simplifier(recherche.trim());
    if (!q || !membres) return [];
    const chiffres = q.replace(/\D/g, "");
    const choisis = new Set(valeur.map((v) => v.id));
    return membres
      .filter((m) => !choisis.has(m.id))
      .filter((m) => simplifier(m.nom_complet).includes(q) || (chiffres.length >= 3 && m.telephone.replace(/\D/g, "").includes(chiffres)))
      .slice(0, 6);
  }, [recherche, membres, valeur]);

  return (
    <div className="flex flex-col gap-2">
      {valeur.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {valeur.map((r) => (
            <span key={r.id} className="flex items-center gap-2 rounded-full bg-accent-soft py-1 pe-1 ps-3 text-sm font-semibold text-text-primary">
              {r.nom_complet}
              <button
                type="button"
                onClick={() => onChange(valeur.filter((v) => v.id !== r.id))}
                aria-label={t("commun.supprimer")}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-bg-elevated"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={t("bus.chercherMembre")}
          className="ps-9"
          aria-label={t("bus.chercherMembre")}
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="overflow-hidden rounded-2xl border border-border-subtle">
          {suggestions.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...valeur, { id: m.id, nom_complet: m.nom_complet, telephone: m.telephone }]);
                  setRecherche("");
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-bg-secondary ${i ? "border-t border-border-subtle" : ""}`}
              >
                <Avatar nom={m.nom_complet} photo={m.photo} taille={32} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text-primary">{m.nom_complet}</span>
                  <span className="block text-xs text-text-secondary">{m.telephone}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {recherche.trim() && membres && suggestions.length === 0 && (
        <p className="text-xs text-text-secondary">{t("bus.aucunMembreTrouve")}</p>
      )}
    </div>
  );
}
