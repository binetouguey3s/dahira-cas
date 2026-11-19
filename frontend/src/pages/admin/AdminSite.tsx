import { Film, ImageUp, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/layout/Logo";
import { IconeReseau, RESEAUX } from "@/components/metier/ReseauxSociaux";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EnTete } from "@/components/ui/Divers";
import { Champ, Input, Interrupteur, Textarea } from "@/components/ui/Input";
import { PHOTO_GUIDE_PAR_DEFAUT, useParametres } from "@/context/ParametresContext";
import { useToast } from "@/context/ToastContext";
import { api, messageErreur, type Parametres } from "@/lib/api";

type Texte = Omit<Parametres, "logo" | "photo_guide" | "video_guide">;

function ChoixImage({ label, aide, actuelle, apercu, onFichier }: { label: string; aide: string; actuelle: string | null; apercu?: React.ReactNode; onFichier: (f: File) => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border-subtle p-4">
      {actuelle ? <img src={actuelle} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : apercu}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{aide}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={() => ref.current?.click()}>
        <ImageUp className="h-4 w-4" /> {t("adminSite.changer")}
      </Button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFichier(e.target.files[0])} />
    </div>
  );
}

/** Champs texte seulement : les fichiers (logo, photo, vidéo) sont envoyés à part. */
function champsTexte(p: Parametres): Texte {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { logo, photo_guide, video_guide, ...texte } = p;
  return texte;
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-bold text-text-primary">{titre}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export default function AdminSite() {
  const { t } = useTranslation();
  const { parametres, remplacer } = useParametres();
  const { notifier } = useToast();
  const [form, setForm] = useState<Texte>(() => champsTexte(parametres));
  const [video, setVideo] = useState<File | null>(null);
  const [retirerVideo, setRetirerVideo] = useState(false);
  const [progression, setProgression] = useState<number | null>(null);
  const refVideo = useRef<HTMLInputElement>(null);

  const choisirVideo = (f: File) => {
    if (f.size > 100 * 1024 * 1024) return notifier(t("adminSite.videoTropLourde"), "erreur");
    setVideo(f);
    setRetirerVideo(false);
  };
  const [images, setImages] = useState<{ logo?: File; photo_guide?: File }>({});
  const [apercus, setApercus] = useState<{ logo?: string; photo_guide?: string }>({});
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    setForm(champsTexte(parametres));
  }, [parametres]);

  const choisir = (champ: "logo" | "photo_guide") => (f: File) => {
    setImages((i) => ({ ...i, [champ]: f }));
    setApercus((a) => ({ ...a, [champ]: URL.createObjectURL(f) }));
  };

  const maj = (c: keyof Texte) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [c]: e.target.value }));

  const enregistrer = async () => {
    setEnvoi(true);
    const donnees = new FormData();
    (Object.keys(form) as (keyof Texte)[]).forEach((c) => {
      if (c !== ("modifie_le" as keyof Texte)) donnees.append(c, String(form[c] ?? ""));
    });
    if (images.logo) donnees.append("logo", images.logo);
    if (images.photo_guide) donnees.append("photo_guide", images.photo_guide);
    if (video) donnees.append("video_guide", video);
    else if (retirerVideo) donnees.append("supprimer_video_guide", "1");
    try {
      const { data } = await api.patch<Parametres>("/site/parametres/", donnees, {
        onUploadProgress: video ? (e) => e.total && setProgression(Math.round((e.loaded / e.total) * 100)) : undefined,
      });
      remplacer(data);
      setVideo(null);
      setRetirerVideo(false);
      setImages({});
      setApercus({});
      notifier(t("commun.enregistre"));
    } catch (err) {
      notifier(messageErreur(err, t("commun.erreur")), "erreur");
    } finally {
      setEnvoi(false);
      setProgression(null);
    }
  };

  return (
    <AppShell>
      <EnTete
        surTitre={t("nav.administration")}
        titre={t("admin.site")}
        sousTitre={t("adminSite.sousTitre")}
        action={
          <Button onClick={enregistrer} chargement={envoi}>
            <Save className="h-4 w-4" /> {progression !== null ? t("adminSite.envoiEnCours", { pourcent: progression }) : t("commun.enregistrer")}
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <Section titre={t("adminSite.identite")}>
          <div className="sm:col-span-2">
            <ChoixImage label={t("adminSite.logo")} aide={t("adminSite.logoAide")} actuelle={apercus.logo ?? parametres.logo} apercu={<Logo taille={64} />} onFichier={choisir("logo")} />
          </div>
          <Champ label={t("adminSite.nomDahira")}>{(id) => <Input id={id} value={form.nom_dahira} onChange={maj("nom_dahira")} />}</Champ>
          <Champ label={t("adminSite.sigle")} aide={t("adminSite.sigleAide")}>{(id) => <Input id={id} value={form.sigle} onChange={maj("sigle")} maxLength={30} />}</Champ>
        </Section>

        <Section titre={t("adminSite.guide")}>
          <div className="sm:col-span-2">
            <ChoixImage
              label={t("adminSite.photoGuide")}
              aide={t("adminSite.photoGuideAide")}
              actuelle={apercus.photo_guide ?? (parametres.photo_guide || PHOTO_GUIDE_PAR_DEFAUT)}
              apercu={<div className="h-16 w-16 rounded-2xl bg-accent-soft" />}
              onFichier={choisir("photo_guide")}
            />
          </div>
          <Champ label={t("adminSite.nomGuide")}>{(id) => <Input id={id} value={form.nom_guide} onChange={maj("nom_guide")} />}</Champ>
          <Champ label={t("adminSite.titreGuide")}>{(id) => <Input id={id} value={form.titre_guide} onChange={maj("titre_guide")} />}</Champ>
          <Champ label={t("biographie.parcours")} className="sm:col-span-2" aide={t("adminSite.videParDefaut")}>
            {(id) => <Textarea id={id} rows={4} value={form.biographie_parcours} onChange={maj("biographie_parcours")} placeholder={t("biographie.texteParcours")} />}
          </Champ>
          <Champ label={t("biographie.vision")} className="sm:col-span-2">
            {(id) => <Textarea id={id} rows={3} value={form.biographie_vision} onChange={maj("biographie_vision")} placeholder={t("biographie.texteVision")} />}
          </Champ>
          <Champ label={t("biographie.enseignements")} className="sm:col-span-2">
            {(id) => (
              <Textarea id={id} rows={3} value={form.biographie_enseignements} onChange={maj("biographie_enseignements")} placeholder={t("biographie.texteEnseignements")} />
            )}
          </Champ>
        </Section>

        <Section titre={t("adminSite.video")}>
          <p className="-mt-2 text-sm text-text-secondary sm:col-span-2">{t("adminSite.videoAide")}</p>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-subtle p-4 sm:col-span-2">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-primary">
              <Film className="h-5 w-5" />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
              {video
                ? t("adminSite.videoChoisie", { nom: video.name })
                : parametres.video_guide && !retirerVideo
                  ? t("adminSite.videoActuelle")
                  : t("adminSite.videoFichier")}
            </p>
            {parametres.video_guide && !video && !retirerVideo && (
              <Button variant="ghost" size="sm" onClick={() => setRetirerVideo(true)}>
                <Trash2 className="h-4 w-4" /> {t("adminSite.videoRetirer")}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => refVideo.current?.click()}>
              <Upload className="h-4 w-4" /> {t("adminSite.changer")}
            </Button>
            <input
              ref={refVideo}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) choisirVideo(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </div>
          <Champ label={t("adminSite.videoLien")} optionnel={t("commun.optionnel")} className="sm:col-span-2">
            {(id) => (
              <Input
                id={id}
                type="url"
                inputMode="url"
                placeholder="https://youtu.be/…"
                value={form.video_guide_lien}
                onChange={maj("video_guide_lien")}
              />
            )}
          </Champ>
          <Champ label={t("adminSite.videoTitre")} optionnel={t("commun.optionnel")} className="sm:col-span-2">
            {(id) => <Input id={id} value={form.video_guide_titre} onChange={maj("video_guide_titre")} placeholder={t("videoGuide.titre")} />}
          </Champ>
          <div className="sm:col-span-2">
            <Interrupteur
              coche={form.video_guide_accueil}
              onChange={(v) => setForm((f) => ({ ...f, video_guide_accueil: v }))}
              label={t("adminSite.videoAccueil")}
              description={t("adminSite.videoAccueilAide")}
            />
          </div>
        </Section>

        <Section titre={t("adminSite.citation")}>
          <Champ label={t("accueil.conseilDuJour")} className="sm:col-span-2" aide={t("adminMedia.traductionAuto")}>
            {(id) => <Textarea id={id} rows={3} value={form.citation_du_jour} onChange={maj("citation_du_jour")} placeholder={t("accueil.citationParDefaut")} />}
          </Champ>
          <Champ label={t("adminSite.citationAuteur")}>{(id) => <Input id={id} value={form.citation_auteur} onChange={maj("citation_auteur")} placeholder={form.nom_guide} />}</Champ>
        </Section>

        <Section titre={t("adminSite.contactPaiement")}>
          <Champ label={t("adminSite.telephoneContact")} aide={t("adminSite.telephoneContactAide")}>
            {(id) => <Input id={id} type="tel" value={form.telephone_contact} onChange={maj("telephone_contact")} />}
          </Champ>
          <Champ label={t("champs.email")}>{(id) => <Input id={id} type="email" value={form.email_contact} onChange={maj("email_contact")} />}</Champ>
          <Champ label={t("champs.adresse")} className="sm:col-span-2">{(id) => <Input id={id} value={form.adresse} onChange={maj("adresse")} />}</Champ>
          <Champ label={t("adminSite.montantCotisation")}>
            {(id) => <Input id={id} type="number" min={1} value={form.montant_cotisation} onChange={maj("montant_cotisation")} />}
          </Champ>
          <div />
          <Champ label={t("adminSite.numeroWave")}>{(id) => <Input id={id} type="tel" value={form.numero_wave} onChange={maj("numero_wave")} />}</Champ>
          <Champ label={t("adminSite.numeroOM")}>{(id) => <Input id={id} type="tel" value={form.numero_orange_money} onChange={maj("numero_orange_money")} />}</Champ>
        </Section>

        <Section titre={t("adminSite.reseaux")}>
          {RESEAUX.map(({ champ, nom, icone }) => (
            <Champ
              key={champ}
              label={
                <span className="inline-flex items-center gap-2">
                  <IconeReseau icone={icone} className="h-4 w-4 text-text-secondary" /> {nom}
                </span>
              }
              optionnel={t("commun.optionnel")}
            >
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={String(form[champ as keyof Texte] ?? "")}
                  onChange={maj(champ as keyof Texte)}
                />
              )}
            </Champ>
          ))}
        </Section>

        <div className="flex justify-end">
          <Button size="lg" onClick={enregistrer} chargement={envoi}>
            <Save className="h-4 w-4" /> {progression !== null ? t("adminSite.envoiEnCours", { pourcent: progression }) : t("commun.enregistrer")}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
