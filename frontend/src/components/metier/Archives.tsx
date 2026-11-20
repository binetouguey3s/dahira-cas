import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { SqueletteListe, Vide } from "@/components/ui/Divers";
import { Confirmation, Modal } from "@/components/ui/Modal";
import { Pagination, usePageServeur } from "@/components/ui/Pagination";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur } from "@/lib/api";
import { formatDateHeure } from "@/lib/utils";

interface ElementArchive {
  id: number;
  archive_le?: string | null;
  archive_par_nom?: string;
}

/** Bouton « Archives » d'une page d'administration. */
export function BoutonArchives({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button variant="outline" onClick={onClick}>
      <Archive className="h-4 w-4" /> {t("archives.titre")}
    </Button>
  );
}

/**
 * Archives d'une liste : chaque élément peut être restauré ou supprimé définitivement.
 * `base` : adresse de la liste (ex. /evenements/evenements/).
 */
export function Archives<T extends ElementArchive>({
  ouvert,
  onFermer,
  base,
  rendu,
  onChange,
}: {
  ouvert: boolean;
  onFermer: () => void;
  base: string;
  rendu: (element: T) => ReactNode;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const { notifier } = useToast();
  const liste = usePageServeur<T>(ouvert ? `${base}?archives=1` : null);
  const [aSupprimer, setASupprimer] = useState<T | null>(null);
  const [occupe, setOccupe] = useState<number | null>(null);

  const restaurer = async (element: T) => {
    setOccupe(element.id);
    try {
      await api.post(`${base}${element.id}/restaurer/`);
      notifier(t("archives.restaure"));
      liste.recharger();
      onChange();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setOccupe(null);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setOccupe(aSupprimer.id);
    try {
      await api.delete(`${base}${aSupprimer.id}/definitif/`);
      notifier(t("archives.supprimeDefinitivement"));
      setASupprimer(null);
      liste.recharger();
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setOccupe(null);
    }
  };

  return (
    <>
      <Modal ouvert={ouvert} onFermer={onFermer} large titre={t("archives.titre")} description={t("archives.aide")}>
        <div ref={liste.ref}>
          {liste.elements === null ? (
            <SqueletteListe />
          ) : liste.elements.length ? (
            <ul className="flex flex-col gap-2">
              {liste.elements.map((el) => (
                <li key={el.id} className="flex flex-col gap-3 rounded-2xl border border-border-subtle p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    {rendu(el)}
                    <p className="mt-1 text-[11px] text-text-secondary">
                      {t("archives.archiveLe", { date: formatDateHeure(el.archive_le) })}
                      {el.archive_par_nom && ` · ${t("archives.par", { nom: el.archive_par_nom })}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" chargement={occupe === el.id && !aSupprimer} onClick={() => restaurer(el)}>
                      <ArchiveRestore className="h-4 w-4" /> {t("archives.restaurer")}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-status-error" onClick={() => setASupprimer(el)}>
                      <Trash2 className="h-4 w-4" /> {t("archives.supprimer")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Vide icone={Archive} titre={t("archives.vide")} />
          )}
          <Pagination page={liste.page} nbPages={liste.nbPages} onChange={liste.changer} />
        </div>
      </Modal>
      <Confirmation
        ouvert={!!aSupprimer}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        titre={t("archives.supprimerTitre")}
        message={t("archives.supprimerMessage")}
        libelleConfirmer={t("archives.supprimer")}
        chargement={occupe !== null}
      />
    </>
  );
}
