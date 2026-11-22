# Guide d'administration

Ce guide s'adresse aux personnes qui gèrent la plateforme pour le Dahira : administrateur
général, responsable Finance, Oustaz, admin contenus et responsables des bus.

Pour l'usage courant (inscription, carte, cotisations côté membre…), voir le
[guide utilisateur](GUIDE_UTILISATEUR.md).

## Sommaire

1. [Rôles et accès](#1-rôles-et-accès)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Membres](#3-membres)
4. [Finance et cotisations](#4-finance-et-cotisations)
5. [Médiathèque](#5-médiathèque)
6. [Événements](#6-événements)
7. [Réservation de bus et espace bus](#7-réservation-de-bus-et-espace-bus)
8. [Questions des membres (Oustaz)](#8-questions-des-membres-oustaz)
9. [Paramètres du site](#9-paramètres-du-site)
10. [Archives](#10-archives)
11. [Traduction automatique](#11-traduction-automatique)
12. [Bonnes pratiques](#12-bonnes-pratiques)

---

## 1. Rôles et accès

| Rôle | Ce qu'il peut faire |
|---|---|
| **Membre** | Son espace : profil, carte, cotisations, questions, réservations |
| **Responsable Finance** | Finance : cotisations, encaissements, relances, rappels par e-mail |
| **Oustaz** | Questions des membres, médiathèque, paramètres du site |
| **Admin Contenus** | Médiathèque, événements, réservations de bus, paramètres du site |
| **Administrateur général** | Tout, y compris les membres et leurs rôles |

En plus de son rôle, n'importe quel membre peut être désigné **responsable des bus** d'un
événement (voir [section 7](#7-réservation-de-bus-et-espace-bus)).

Les pages d'administration se trouvent dans le menu **Administration** (menu **Plus** sur
téléphone). Sur chaque page, la flèche **← Tableau de bord** en haut à gauche ramène au tableau
de bord.

**Donner un rôle à quelqu'un** : la personne s'inscrit d'abord elle-même, puis l'administrateur
général ouvre **Membres**, touche sa fiche, choisit le **rôle** et enregistre. Personne ne peut
modifier son propre rôle.

## 2. Tableau de bord

Chaque rôle voit les chiffres qui le concernent : membres actifs (et nouveaux du mois),
cotisations du mois, montant encaissé dans l'année, cotisations impayées, questions en attente,
enseignements publiés, événements à venir. En dessous, des raccourcis vers chaque espace de
gestion, et **Inscrire un membre** pour quelqu'un qui n'a pas de smartphone.

## 3. Membres

*Administrateur général uniquement.*

- **Rechercher** par nom, téléphone ou numéro de carte ; filtrer par rôle et par statut
  (actifs / désactivés). Liste par pages de 10.
- **Fiche membre** : modifier le nom, le téléphone, l'e-mail, la profession, l'adresse, le pays
  et le **rôle**. On y voit aussi la dernière connexion et le nombre de cotisations payées.
- **Désactiver un compte** (interrupteur « Compte actif ») : la personne ne peut plus se
  connecter et sa carte n'est plus reconnue par le QR code. Rien n'est supprimé ; on peut le
  réactiver à tout moment.
- **Réinitialiser le mot de passe** : génère un mot de passe provisoire à transmettre au membre
  (bouton pour l'envoyer par WhatsApp). Le membre le change ensuite dans son profil.
- **Inscrire un membre** : crée le compte à sa place avec un mot de passe provisoire, puis
  affiche un message prêt à envoyer avec ses identifiants.

## 4. Finance et cotisations

*Responsable Finance et administrateur général.*

### Le mois en cours
- Choisissez le **mois** et l'**année** en haut de page. Les chiffres indiquent l'encaissé,
  l'attendu, le nombre de cotisations payées et le taux de paiement.
- Onglets **Toutes / Impayées / Payées** et recherche par nom ou téléphone.
- **Encaisser** : choisissez le moyen (Wave, Orange Money, autre) et, si possible, la
  **référence de la transaction** reçue par SMS. La date de paiement est enregistrée.
- **Annuler le paiement** : remet la cotisation en impayé (en cas d'erreur).
- **Rappeler par WhatsApp** (bouton vert) : ouvre WhatsApp avec un message de rappel déjà écrit.
- **Ajouter** : crée une cotisation pour un membre et un mois précis.
- **Générer le mois** : crée en une fois la cotisation de tous les membres actifs qui n'en ont
  pas encore pour ce mois (ce que fait aussi le robot automatique le 1er du mois).
- **Archiver** (icône boîte) : retire une cotisation créée par erreur ; elle reste récupérable
  dans **Archives**.
- **Exporter (Excel)** : télécharge un fichier .xlsx de l'année affichée, avec deux onglets :
  - *Tableau* : une ligne par membre, une colonne par mois (vert = payé, rouge = en retard,
    jaune = à payer), total payé et reste dû, et le total général ;
  - *Paiements* : la liste détaillée des paiements reçus (date, membre, mois, montant, moyen,
    référence).
- **Membre non inscrit** : ajoute un membre du Dahira qui n'a pas de compte sur la plateforme
  (sans smartphone, par exemple) : nom, et si possible téléphone et adresse. Il a ses cotisations
  comme les autres (celle du mois est créée tout de suite), apparaît avec la mention « Sans compte »,
  mais ne peut pas se connecter. S'il s'inscrit un jour avec le même numéro de téléphone, il
  retrouve automatiquement son numéro de carte et tout son historique de cotisations.

### Vue de l'année
En haut de la page Finance, l'onglet **Année** affiche une carte par membre avec ses 12 mois en
couleur (vert = payé, rouge = en retard, jaune = à payer, pointillé = pas de cotisation) et ce qui
reste à payer.
- **Touchez un mois** pour l'encaisser (Wave, Orange Money ou espèces / autre, référence
  facultative). S'il n'y a pas encore de cotisation ce mois-là, elle est créée et marquée payée.
- Touchez un mois **payé** pour voir la date, le moyen et la référence, ou annuler le paiement.
- **Retardataires seulement** : n'affiche que les membres qui doivent encore quelque chose.
- Recherche par nom, téléphone ou n° de carte ; 10 membres par page.

### Ce que fait le robot automatique chaque matin
1. **Le 1er du mois** : crée les cotisations du mois pour chaque membre actif.
2. **Chaque jour** : passe « en retard » les mois précédents non payés.
3. **Au jour choisi** (le 10 par défaut) : envoie un e-mail de rappel aux membres qui ont une
   adresse e-mail et des mois impayés.

Le robot ne crée jamais de doublon et n'envoie les rappels qu'une fois par mois.

### Carte « Rappels de cotisation par e-mail »
- Activer ou couper l'**envoi automatique**, et choisir le **jour d'envoi** (1 à 28).
- Voir combien de membres sont concernés, combien recevront l'e-mail et combien n'ont pas
  d'adresse (à relancer par WhatsApp).
- **Envoyer les rappels maintenant** : envoi immédiat, après confirmation (pas plus d'un envoi
  toutes les 10 minutes).

Le montant de la cotisation mensuelle et les numéros Wave / Orange Money du Dahira se règlent
dans **Paramètres du site**.

## 5. Médiathèque

*Oustaz, admin contenus et administrateur général.*

1. **Publier** : titre, auteur, type (audio, vidéo, texte).
2. Contenu : **fichier** (100 Mo maximum, barre de progression pendant l'envoi), **lien**
   (YouTube, SoundCloud…) ou **texte** de l'enseignement.
3. **Catégorie (occasion)** : Magal, Gamou, Nisfou Shabaan, Leylatul Khadr, Dahira, Causerie,
   ou **Autre** avec une précision libre (Kazu Rajab, Tamkharit…).
4. **Événement lié** (facultatif) : la catégorie de l'événement est reprise automatiquement.
5. Description (traduite automatiquement dans les autres langues).

La liste montre les « j'aime » et les téléchargements. **Modifier** (crayon) ou **Archiver**
(boîte) chaque enseignement.

## 6. Événements

*Admin contenus et administrateur général.*

- Onglets **À venir / Passés**, liste par pages de 10.
- **Nouvel événement** : titre, date et heure, catégorie, lieu, description.
  - Le **lieu** n'est jamais traduit (« Keur Ndiaye Lo » reste tel quel).
  - La **description** est traduite automatiquement.
- **Annoncer par e-mail** (icône mégaphone, événements à venir) : chaque membre qui a une adresse
  e-mail reçoit l'annonce dans sa langue, avec la date, le lieu, la description, la réservation de
  bus si elle est ouverte et le lien vers l'événement. Personne ne la reçoit deux fois : un
  nouveau clic ne l'envoie qu'aux membres qui ne l'ont pas encore reçue (nouveaux inscrits).
  Au-delà de 200 envois dans la journée, la suite part automatiquement le lendemain matin.
  La mention « Annoncé à N membres » s'affiche sur l'événement. Les membres peuvent couper ces
  annonces dans leur profil.
- **Activer la réservation de bus** : voir la section suivante.
- **Archiver** un événement le retire du site (ses réservations sont conservées).

## 7. Réservation de bus et espace bus

### Ouvrir la réservation (admin contenus / administrateur général)
Dans la fiche de l'événement, activez **Réservation de bus**, puis renseignez :

| Champ | Rôle |
|---|---|
| Nombre de bus | Combien de bus partent |
| Places par bus | Nombre de places assises dans chaque bus |
| Prix d'une place (FCFA) | Vide ou 0 si le transport est gratuit |
| Responsables des bus | Cherchez les membres par nom ou téléphone et ajoutez-les |

Les responsables reçoivent les paiements, valident les réservations et voient les listes. Leur
nom et leur contact sont visibles par les membres connectés. On ne peut pas réduire le nombre de
bus ou de places en dessous des places déjà réservées.

### Fonctionnement côté membre
Le membre écrit le nom de chaque passager (bouton **Moi** pour lui-même). Les places sont
attribuées automatiquement : bus 1 jusqu'à ce qu'il soit plein, puis bus 2, etc. Il paie aux
numéros d'un responsable (ou en espèces), puis touche **J'ai payé**.

### L'espace bus du responsable
Le menu **Espace bus** apparaît pour chaque responsable désigné (et pour les admins contenus).
Il liste les événements dont il gère les bus, avec le nombre de paiements à vérifier et de
réservations en attente. En ouvrant un événement :

- **Totaux** : places réservées / capacité, encaissé, à vérifier, reste à encaisser.
- **Mes numéros** : vos numéros Wave et Orange Money (pré-remplis avec votre téléphone) et
  « J'accepte aussi les paiements en espèces ». Modifiez-les si besoin : les membres les voient
  pour payer.
- **Onglet À traiter**
  - *Paiements à vérifier* : contrôlez sur votre téléphone (Wave, Orange Money) ou dans votre
    caisse que l'argent est arrivé, puis **Valider** ou **Refuser**.
  - *Réservations à accepter* : **Accepter** les nouvelles réservations.
- **Onglet Réservations** : chaque réservation avec ses passagers et leur bus, les montants, le
  détail des paiements (qui a validé, quand), et les actions **Accepter**, **Enregistrer un
  paiement** (espèces reçues en main propre, validé directement) et **Annuler la réservation**.
  Recherche par nom ou numéro.
- **Onglet Bus** : la liste des passagers de chaque bus, avec leur statut. Vous pouvez **changer
  un passager de bus** ou le **retirer**.
- **Ajouter une réservation** : pour une personne qui n'a pas l'application (réservation par
  téléphone ou sur place). Elle est acceptée d'office.
- **Imprimer les listes** : une page par bus, avec une case à cocher pour l'appel au départ.
- **Exporter (Excel)** : la liste complète des passagers.

### Statuts d'une réservation
En attente → Acceptée → Acompte reçu → Payée, ou Annulée. Valider un paiement accepte aussi la
réservation. Une réservation annulée libère ses places ; les paiements déjà validés restent
visibles dans l'historique.

## 8. Questions des membres (Oustaz)

- Onglets **En attente / Répondues**, recherche, liste par pages de 10.
- Répondre par **texte** et/ou **message vocal**. Une réponse peut être modifiée ensuite.
- Les questions des membres sont traduites automatiquement dans votre langue ; les réponses
  restent telles que vous les écrivez.
- **Archiver** une question la retire de la liste ; elle reste récupérable dans **Archives**.

## 9. Paramètres du site

*Oustaz, admin contenus et administrateur général.*

| Section | Contenu |
|---|---|
| Identité du Dahira | Logo, nom, sigle (affiché sur les cartes de membre) |
| Le Guide | Photo, nom, titre, textes de la biographie (parcours, vision, enseignements) |
| Vidéo de présentation | Fichier ou lien YouTube / Vimeo, titre, affichage aussi sur l'accueil |
| Citation du jour | Texte et auteur affichés sur l'accueil |
| Traduction automatique | Liste des mots à ne jamais traduire |
| Contact et paiement | Téléphone / WhatsApp, e-mail, adresse, montant de la cotisation, numéros Wave / Orange Money |
| Réseaux sociaux | Liens TikTok, WhatsApp, Telegram, Facebook, Instagram, YouTube (« Nos canaux » sur l'accueil) |

## 10. Archives

Dans **Médiathèque**, **Événements**, **Finance** et **Questions**, le bouton de suppression
s'appelle **Archiver** : l'élément disparaît du site mais n'est pas perdu.

Le bouton **Archives** en haut de chaque page liste les éléments archivés, avec la date et le
nom de la personne qui a archivé. Pour chacun :

- **Restaurer** : il réapparaît immédiatement à sa place ;
- **Supprimer définitivement** : après confirmation, il est effacé pour de bon (fichier compris
  pour un enseignement). Cette action est irréversible.

Un élément archivé n'apparaît plus nulle part : listes, accueil, statistiques, rappels.

## 11. Traduction automatique

Les textes saisis par l'administration (titres et descriptions d'événements, enseignements,
citation, questions) sont traduits automatiquement en anglais, espagnol et arabe.

Restent toujours tels quels :
- les **termes religieux** (Magal, Gamou, Khassaïdes, Serigne Touba, Cheikh Ahmadou Bamba…),
  écrits sous leur forme arabe usuelle en arabe ;
- les **lieux** des événements et les adresses ;
- les **noms et prénoms** courants (Ndiaye, Fall, Diop, Moussa, Awa…), « Keur … », « Darou … »,
  « Kourel » ;
- les **années**, écrites en chiffres seuls (« 2026 »).

Pour protéger d'autres mots (un nom de famille rare, un quartier, un kourel), ajoutez-les dans
**Paramètres du site → Traduction automatique**, un par ligne. Les traductions concernées sont
refaites automatiquement.

## Adresses e-mail @dahiracas.com

Pour faire recevoir les messages de contact@dahiracas.com par d'autres personnes, ou créer des
adresses par rôle (finance@, bus@…), voir le [guide des adresses e-mail](GUIDE_EMAILS.md).

## 12. Bonnes pratiques

- **Désactivez** un compte plutôt que de le supprimer : l'historique des cotisations reste.
- **Archivez** plutôt que de supprimer définitivement, sauf en cas de doublon évident.
- Notez toujours la **référence de transaction** Wave / Orange Money : elle évite les litiges.
- Pour un grand événement, désignez **au moins deux responsables des bus**, et imprimez les
  listes la veille du départ.
- Demandez aux membres d'ajouter leur **e-mail** : il sert au mot de passe oublié et aux rappels.
