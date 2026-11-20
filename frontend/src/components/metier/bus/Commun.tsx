import { Banknote, Check, Copy, MessageCircle, Phone, Plus, User, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import type { MoyenPaiementBus, PassagerBus, ResponsableBus, StatutPaiementBus, StatutReservationBus } from "@/lib/api";
import { cn } from "@/lib/utils";

export const MAX_PASSAGERS = 10;

export const MOYENS: Record<MoyenPaiementBus, { nom: string; couleur: string; fond: string; sigle: string }> = {
  wave: { nom: "Wave", couleur: "#1DC8F2", fond: "#E6F8FE", sigle: "W" },
  orange_money: { nom: "Orange Money", couleur: "#FF7900", fond: "#FFF1E5", sigle: "OM" },
  especes: { nom: "", couleur: "#1E7A5D", fond: "#E8F3EE", sigle: "" },
};

/** Logo carré d'un moyen de paiement (Wave, Orange Money ou espèces). */
export function LogoMoyen({ moyen, className }: { moyen: MoyenPaiementBus; className?: string }) {
  const m = MOYENS[moyen];
  return (
    <span
      aria-hidden
      className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white", className)}
      style={{ background: m.couleur }}
    >
      {moyen === "especes" ? <Banknote className="h-4 w-4" /> : m.sigle}
    </span>
  );
}

export function nomMoyen(moyen: MoyenPaiementBus, t: (k: string) => string) {
  return moyen === "especes" ? t("bus.especes") : MOYENS[moyen].nom;
}

const TONS_STATUT: Record<StatutReservationBus, "neutral" | "success" | "warning" | "error" | "or"> = {
  en_attente: "warning",
  acceptee: "or",
  acompte: "or",
  payee: "success",
  annulee: "error",
};

export function BadgeStatut({ statut }: { statut: StatutReservationBus }) {
  const { t } = useTranslation();
  return <Badge tone={TONS_STATUT[statut]}>{t(`bus.statuts.${statut}`)}</Badge>;
}

const TONS_PAIEMENT: Record<StatutPaiementBus, "warning" | "success" | "error"> = {
  a_verifier: "warning",
  valide: "success",
  refuse: "error",
};

export function BadgePaiement({ statut }: { statut: StatutPaiementBus }) {
  const { t } = useTranslation();
  return <Badge tone={TONS_PAIEMENT[statut]}>{t(`bus.paiementStatuts.${statut}`)}</Badge>;
}

/** Numéro au format WhatsApp (chiffres seulement, avec l'indicatif). */
export function lienWhatsApp(telephone: string) {
  const chiffres = telephone.replace(/[^\d]/g, "");
  const complet = telephone.trim().startsWith("+") ? chiffres : chiffres.length === 9 ? `221${chiffres}` : chiffres;
  return `https://wa.me/${complet}`;
}

/** Responsable des bus : nom, appel / WhatsApp et numéros de paiement copiables. */
export function CarteResponsable({ responsable }: { responsable: ResponsableBus }) {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const copier = async (numero: string) => {
    try {
      await navigator.clipboard.writeText(numero.replace(/\s+/g, ""));
      notifier(t("bus.numeroCopie"));
    } catch {
      /* presse-papiers indisponible */
    }
  };
  const numeros: [MoyenPaiementBus, string][] = [
    ["wave", responsable.numero_wave],
    ["orange_money", responsable.numero_orange_money],
  ];
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 font-semibold text-text-primary">
          <User className="h-4 w-4 shrink-0 text-accent-primary" />
          <span className="truncate">{responsable.nom}</span>
        </p>
        {responsable.telephone && (
          <div className="flex shrink-0 gap-1">
            <a
              href={`tel:${responsable.telephone}`}
              aria-label={t("bus.appeler")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-accent-soft"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={lienWhatsApp(responsable.telephone)}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366]/25"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {numeros
          .filter(([, numero]) => numero)
          .map(([moyen, numero]) => (
            <button
              key={moyen}
              type="button"
              onClick={() => copier(numero)}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-start transition hover:bg-bg-secondary"
              style={{ background: MOYENS[moyen].fond }}
            >
              <LogoMoyen moyen={moyen} className="h-8 w-8" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold" style={{ color: MOYENS[moyen].couleur }}>
                  {MOYENS[moyen].nom}
                </span>
                <span className="block font-semibold tabular-nums text-[#1a1a1a]">{numero}</span>
              </span>
              <Copy className="h-4 w-4 text-[#555]" />
            </button>
          ))}
        {responsable.accepte_especes && (
          <p className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm" style={{ background: MOYENS.especes.fond }}>
            <LogoMoyen moyen="especes" className="h-8 w-8" />
            <span className="font-semibold text-[#1E7A5D]">{t("bus.especesAcceptees")}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/** Liste des passagers : « Moi » en un geste, puis le prénom et le nom de chaque autre personne. */
export function ListePassagers({
  passagers,
  onChange,
  nomMoi,
  avecMoi = true,
}: {
  passagers: PassagerBus[];
  onChange: (passagers: PassagerBus[]) => void;
  nomMoi?: string;
  avecMoi?: boolean;
}) {
  const { t } = useTranslation();
  const aMoi = passagers.some((p) => p.est_titulaire);
  const maj = (i: number, nom: string) => onChange(passagers.map((p, j) => (j === i ? { ...p, nom } : p)));
  const retirer = (i: number) => onChange(passagers.filter((_, j) => j !== i));
  const plein = passagers.length >= MAX_PASSAGERS;

  return (
    <div className="flex flex-col gap-2">
      {passagers.map((p, i) => (
        <div key={p.id ?? `n${i}`} className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-primary">
            {i + 1}
          </span>
          {p.est_titulaire ? (
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-accent-primary/40 bg-accent-soft px-3 text-sm">
              <Check className="h-4 w-4 shrink-0 text-accent-primary" />
              <span className="truncate font-semibold text-text-primary">
                {t("bus.moi")}
                {nomMoi && <span className="font-normal text-text-secondary"> · {nomMoi}</span>}
              </span>
            </div>
          ) : (
            <Input
              value={p.nom}
              onChange={(e) => maj(i, e.target.value)}
              placeholder={t("bus.prenomNom")}
              aria-label={t("bus.passagerN", { n: i + 1 })}
              autoComplete="off"
              className="min-w-0 flex-1"
            />
          )}
          {passagers.length > 1 && (
            <button
              type="button"
              onClick={() => retirer(i)}
              aria-label={t("commun.supprimer")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-status-error-bg hover:text-status-error"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {avecMoi && !aMoi && !plein && (
          <Button type="button" variant="secondary" size="sm" onClick={() => onChange([{ nom: "", est_titulaire: true }, ...passagers])}>
            <User className="h-4 w-4" /> {t("bus.ajouterMoi")}
          </Button>
        )}
        {!plein && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...passagers, { nom: "" }])}>
            <Plus className="h-4 w-4" /> {t("bus.ajouterPersonne")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function passagersValides(passagers: PassagerBus[]) {
  return passagers.length > 0 && passagers.every((p) => p.est_titulaire || p.nom.trim().length >= 2);
}
