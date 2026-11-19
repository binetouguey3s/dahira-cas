import { siFacebook, siInstagram, siTelegram, siTiktok, siWhatsapp, siYoutube, type SimpleIcon } from "simple-icons";

import type { Parametres } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Logos officiels (bibliothèque libre Simple Icons), dans l'ordre d'affichage. */
export const RESEAUX: { champ: keyof Parametres; nom: string; icone: SimpleIcon; neutre?: boolean }[] = [
  { champ: "lien_tiktok", nom: "TikTok", icone: siTiktok, neutre: true },
  { champ: "lien_whatsapp", nom: "WhatsApp", icone: siWhatsapp },
  { champ: "lien_telegram", nom: "Telegram", icone: siTelegram },
  { champ: "lien_facebook", nom: "Facebook", icone: siFacebook },
  { champ: "lien_instagram", nom: "Instagram", icone: siInstagram },
  { champ: "lien_youtube", nom: "YouTube", icone: siYoutube },
];

export function IconeReseau({ icone, className }: { icone: SimpleIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-[18px] w-[18px] shrink-0", className)} fill="currentColor" aria-hidden>
      <path d={icone.path} />
    </svg>
  );
}

/** Bloc « Nos canaux » : une pastille par réseau renseigné dans les paramètres du site. */
export function ReseauxSociaux({ parametres, className }: { parametres: Parametres; className?: string }) {
  const liens = RESEAUX.filter((r) => /^https?:\/\//i.test(String(parametres[r.champ] ?? "")));
  if (!liens.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2.5", className)}>
      {liens.map(({ champ, nom, icone, neutre }) => (
        <li key={champ}>
          <a
            href={String(parametres[champ])}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={nom}
            style={
              // Le logo TikTok est noir : il suit la couleur du texte pour rester visible en mode sombre.
              (neutre
                ? { "--marque": "var(--text-primary)", "--sur-marque": "var(--bg-primary)" }
                : { "--marque": `#${icone.hex}`, "--sur-marque": "#ffffff" }) as React.CSSProperties
            }
            className="group flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated py-2 pe-4 ps-2.5 text-sm font-semibold text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--marque)] hover:shadow-[0_10px_24px_-14px_var(--marque)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-primary/20"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-[var(--marque)] transition-colors duration-200 group-hover:bg-[var(--marque)] group-hover:text-[var(--sur-marque)]">
              <IconeReseau icone={icone} className="h-4 w-4" />
            </span>
            {nom}
          </a>
        </li>
      ))}
    </ul>
  );
}
