# Guide des adresses e-mail @dahiracas.com

Ce guide explique comment gérer les adresses e-mail du Dahira : qui reçoit les messages envoyés
à contact@dahiracas.com, comment ajouter ou retirer une personne, et comment créer d'autres
adresses (finance@, bus@…). Aucune connaissance technique n'est nécessaire.

## Sommaire

1. [Comment ça marche](#1-comment-ça-marche)
2. [Ajouter une personne qui reçoit contact@](#2-ajouter-une-personne-qui-reçoit-contact)
3. [Retirer ou changer une personne](#3-retirer-ou-changer-une-personne)
4. [Créer une adresse par rôle](#4-créer-une-adresse-par-rôle)
5. [Bon à savoir](#5-bon-à-savoir)
6. [En cas de problème](#6-en-cas-de-problème)

---

## 1. Comment ça marche

| Sens | Service | Adresse |
|---|---|---|
| **Envoi** des e-mails du site (bienvenue, mot de passe oublié, rappels, annonces) | Brevo | `no-reply@dahiracas.com` |
| **Réception** des messages envoyés au Dahira | ImprovMX | `contact@dahiracas.com` et toute adresse `…@dahiracas.com` |

ImprovMX ne stocke pas les messages : il les **fait suivre** vers une ou plusieurs boîtes Gmail
(ou autre). Aujourd'hui, une règle `*` envoie **toutes** les adresses @dahiracas.com vers la boîte
de l'administratrice.

Quand un membre **répond** à un e-mail du site, sa réponse part vers `contact@dahiracas.com`
(adresse réglée dans **Administration → Paramètres du site → Contact et paiement → E-mail**).

## 2. Ajouter une personne qui reçoit contact@

Exemple : le trésorier doit aussi recevoir les messages envoyés à contact@dahiracas.com.

1. Connectez-vous sur **app.improvmx.com** (avec le compte de l'administratrice).
2. Sous **dahiracas.com**, sur la ligne vide **« nouvel-alias »** :
   - à gauche, écrivez `contact` ;
   - à droite, dans **« EN AVANT À »**, écrivez les adresses **séparées par une virgule**, par exemple :
     `administratrice@gmail.com, tresorier@gmail.com`
3. Cliquez sur **AJOUTER**.

Résultat : les messages envoyés à contact@dahiracas.com arrivent dans **les deux** boîtes. Les autres
adresses (info@, etc.) continuent d'arriver seulement chez l'administratrice, grâce à la ligne `*`.

> Pensez à **garder votre propre adresse** dans la liste, sinon vous ne recevrez plus contact@.

## 3. Retirer ou changer une personne

1. Sur **app.improvmx.com**, repérez la ligne `contact` (ou l'adresse concernée).
2. Touchez les **•••** au bout de la ligne, puis **Modifier**.
3. Retirez ou remplacez l'adresse dans la liste, puis enregistrez.

Pour **supprimer complètement** une adresse (ex. `bus@`), choisissez **Supprimer** dans le même menu.
Les messages envoyés à cette adresse arriveront alors chez l'administratrice (règle `*`).

## 4. Créer une adresse par rôle

Chaque responsable peut avoir son adresse, qui arrive directement chez lui :

| Adresse | Pour qui |
|---|---|
| `finance@dahiracas.com` | Responsable Finance |
| `bus@dahiracas.com` | Responsables des bus (plusieurs adresses possibles) |
| `oustaz@dahiracas.com` | Oustaz |
| `evenements@dahiracas.com` | Admin contenus |

Pour chacune : ligne **« nouvel-alias »**, écrivez le début de l'adresse (ex. `finance`), la ou les
adresses de destination, puis **AJOUTER**. Elle fonctionne immédiatement.

## 5. Bon à savoir

- **Recevoir seulement.** Les personnes reçoivent les messages dans leur propre boîte. Quand elles
  répondent, la réponse part de **leur adresse personnelle**, pas de @dahiracas.com. (Répondre depuis
  une adresse @dahiracas.com est l'option payante d'ImprovMX, environ 9 $/mois : non nécessaire.)
- **La pastille rouge « Expéditeur »** dans ImprovMX concerne cette option d'envoi payante : on
  peut l'ignorer.
- **Offre gratuite.** Elle suffit largement pour le Dahira, mais limite le nombre d'adresses et de
  destinataires. Si ImprovMX refuse un ajout, la limite est atteinte : regroupez des adresses ou
  envisagez l'offre payante.
- **Rien à changer sur le site** quand vous ajoutez ou retirez une personne : le site envoie
  toujours vers contact@dahiracas.com et ImprovMX distribue.
- **Ne touchez pas** aux réglages DNS du domaine (chez Vercel) : ils sont déjà en place
  (lignes MX, SPF, et celles de Brevo).

## 6. En cas de problème

| Problème | Que faire |
|---|---|
| Un message envoyé à contact@ n'arrive pas | Vérifier les **courriers indésirables** de la boîte Gmail ; vérifier l'orthographe des adresses dans ImprovMX |
| Un essai envoyé depuis sa propre boîte n'apparaît pas | Normal avec Gmail : faites l'essai depuis **une autre adresse** |
| ImprovMX affiche une erreur sur les lignes **MX** | Les réglages DNS ont été modifiés : ils doivent contenir `MX 10 mx1.improvmx.com` et `MX 20 mx2.improvmx.com` (voir GUIDE_DEMARRAGE.md, section Services externes) |
| Les membres ne reçoivent plus les e-mails du site | Ce n'est pas ImprovMX mais Brevo (envoi) : voir le guide de démarrage, section Brevo |
