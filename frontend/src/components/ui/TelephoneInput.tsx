import { AsYouType, getExampleNumber, parsePhoneNumberFromString } from "libphonenumber-js/min";
import exemples from "libphonenumber-js/mobile/examples";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { estCodePays, indicatif, nomPays, PAYS_PAR_DEFAUT, type CodePays } from "@/lib/pays";
import { cn } from "@/lib/utils";

import { Drapeau, PopoverPays } from "./SelecteurPays";

/** Décompose une valeur enregistrée (+221771234567) en pays + numéro national lisible. */
function decomposer(valeur: string, paysParDefaut: CodePays): { pays: CodePays; saisie: string } {
  if (valeur.startsWith("+")) {
    const numero = parsePhoneNumberFromString(valeur);
    if (numero?.country) return { pays: numero.country, saisie: numero.formatNational() };
  }
  return { pays: paysParDefaut, saisie: valeur };
}

/** Mise en forme pendant la saisie ; format national complet (06 12 34 56 78, 77 123 45 67) dès que le numéro est valide. */
function formater(chiffres: string, pays: CodePays) {
  const numero = parsePhoneNumberFromString(chiffres, pays);
  if (numero?.isValid()) return numero.formatNational();
  return new AsYouType(pays).input(chiffres);
}

/** Valeur envoyée au serveur : format international (+221771234567) dès que possible. */
function composer(saisie: string, pays: CodePays): string {
  const texte = saisie.trim();
  if (!texte) return "";
  const international = texte.startsWith("00") ? `+${texte.slice(2)}` : texte;
  const numero = international.startsWith("+")
    ? parsePhoneNumberFromString(international)
    : parsePhoneNumberFromString(international, pays);
  if (numero) return numero.number;
  const chiffres = international.replace(/[^\d+]/g, "");
  return chiffres.startsWith("+") ? chiffres : `${indicatif(pays)}${chiffres}`;
}

/**
 * Téléphone « comme sur les sites modernes » : drapeau + indicatif à choisir dans la liste de tous les pays,
 * mise en forme pendant la saisie, et détection automatique du pays si l'on tape +33…, 0033…
 * `libre` autorise aussi un identifiant texte (connexion d'un administrateur).
 */
export function TelephoneInput({
  id,
  valeur,
  onChange,
  paysParDefaut,
  libre = false,
  required,
  autoFocus,
}: {
  id?: string;
  valeur: string;
  onChange: (valeur: string) => void;
  paysParDefaut?: string;
  libre?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const defaut: CodePays = estCodePays(paysParDefaut) ? (paysParDefaut.toUpperCase() as CodePays) : PAYS_PAR_DEFAUT;
  const [etat, setEtat] = useState(() => decomposer(valeur, defaut));
  const derniereValeur = useRef(valeur);
  const champ = useRef<HTMLInputElement>(null);

  // Valeur modifiée de l'extérieur (formulaire réinitialisé, membre chargé…)
  useEffect(() => {
    if (valeur !== derniereValeur.current) {
      derniereValeur.current = valeur;
      setEtat(decomposer(valeur, defaut));
    }
  }, [valeur, defaut]);

  const emettre = (saisie: string, pays: CodePays) => {
    setEtat({ saisie, pays });
    const sortie = libre && /[a-z]/i.test(saisie) ? saisie.trim() : composer(saisie, pays);
    derniereValeur.current = sortie;
    onChange(sortie);
  };

  const surSaisie = (texte: string) => {
    if (libre && /[a-z]/i.test(texte)) return emettre(texte, etat.pays);
    const efface = texte.length < etat.saisie.length;
    const brut = texte.startsWith("00") ? `+${texte.slice(2)}` : texte;
    if (brut.startsWith("+")) {
      // Numéro international : on reconnaît le pays et on passe au format national.
      const formateur = new AsYouType();
      formateur.input(brut);
      const pays = formateur.getCountry();
      const national = formateur.getNumber()?.nationalNumber;
      if (pays && national) return emettre(formater(national, pays), pays);
      return emettre(brut, etat.pays);
    }
    emettre(efface ? texte : formater(texte, etat.pays), etat.pays);
  };

  const changerPays = (pays: CodePays) => {
    const chiffres = etat.saisie.startsWith("+") ? "" : etat.saisie.replace(/\D/g, "");
    emettre(chiffres ? formater(chiffres, pays) : "", pays);
    requestAnimationFrame(() => champ.current?.focus());
  };

  const valide = !!etat.saisie && parsePhoneNumberFromString(composer(etat.saisie, etat.pays))?.isValid();
  const exemple = getExampleNumber(etat.pays, exemples)?.formatNational() ?? "";

  return (
    <div
      dir="ltr"
      className="flex h-12 w-full items-stretch overflow-hidden rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated transition-[border-color,box-shadow] duration-200 focus-within:border-accent-primary focus-within:ring-4 focus-within:ring-accent-primary/15 hover:border-border-default"
    >
      <PopoverPays valeur={etat.pays} avecIndicatif onChoisir={changerPays}>
        <button
          type="button"
          aria-label={`${t("pays.indicatif")} : ${nomPays(etat.pays, i18n.language)} ${indicatif(etat.pays)}`}
          className="flex shrink-0 items-center gap-1.5 border-e border-border-subtle bg-bg-secondary/60 ps-3 pe-2 text-sm font-semibold tabular-nums text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:bg-bg-secondary"
        >
          <Drapeau code={etat.pays} />
          <span>{indicatif(etat.pays)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
        </button>
      </PopoverPays>
      <input
        ref={champ}
        id={id}
        type={libre ? "text" : "tel"}
        inputMode={libre ? "text" : "tel"}
        autoComplete={libre ? "username" : "tel-national"}
        autoFocus={autoFocus}
        required={required}
        value={etat.saisie}
        onChange={(e) => surSaisie(e.target.value)}
        placeholder={exemple || t("champs.telephone")}
        className="min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
      />
      <span className={cn("flex items-center pe-3 text-accent-primary transition-opacity", valide ? "opacity-100" : "opacity-0")} aria-hidden>
        <CheckCircle2 className="h-4 w-4" />
      </span>
    </div>
  );
}
