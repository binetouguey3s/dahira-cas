import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { Button } from "./Button";

interface ModalProps {
  ouvert: boolean;
  onFermer: () => void;
  titre: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  pied?: ReactNode;
  large?: boolean;
}

/** Fenêtre modale : panneau qui monte du bas sur mobile, boîte centrée sur ordinateur. */
export function Modal({ ouvert, onFermer, titre, description, children, pied, large }: ModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <AnimatePresence>
        {ouvert && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[#04140f]/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={description ? undefined : undefined}>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] border border-border-subtle bg-bg-elevated shadow-2xl focus:outline-none",
                  "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[88dvh] md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[24px]",
                  large ? "md:max-w-3xl" : "md:max-w-lg",
                )}
              >
                <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border-default/40 md:hidden" />
                <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-4 md:pt-6">
                  <div>
                    <Dialog.Title className="text-lg font-bold text-text-primary">{titre}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-sm text-text-secondary">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{titre}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon" aria-label={t("commun.fermer")} className="-me-2 shrink-0">
                      <X className="h-5 w-5" />
                    </Button>
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">{children}</div>
                {pied && (
                  <div className="flex flex-col-reverse gap-2 border-t border-border-subtle px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
                    {pied}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Demande de confirmation avant une action irréversible. */
export function Confirmation({
  ouvert,
  onFermer,
  onConfirmer,
  titre,
  message,
  libelleConfirmer,
  danger = true,
  chargement,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onConfirmer: () => void;
  titre: ReactNode;
  message: ReactNode;
  libelleConfirmer: string;
  danger?: boolean;
  chargement?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      titre={titre}
      pied={
        <>
          <Button variant="outline" onClick={onFermer}>
            {t("commun.annuler")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirmer} chargement={chargement}>
            {libelleConfirmer}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-text-secondary">{message}</p>
    </Modal>
  );
}
