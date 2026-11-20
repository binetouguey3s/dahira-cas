# Réservation de bus — conception (20/11/2026)

## Pourquoi
Avant l'application, quelques membres géraient les bus des grands événements (Magal, Gamou…) :
ils donnaient leur numéro Wave / Orange Money (ou acceptaient les espèces), notaient chaque passager
et suivaient qui avait payé. L'application doit reprendre exactement ce fonctionnement, de façon traçable.

## Décisions de l'utilisatrice
- Un ou plusieurs **responsables pour tout l'événement** (pas un par bus), désignés par l'Admin général
  ou l'Admin contenus en même temps qu'il ouvre la réservation de bus de l'événement.
- Le membre paie **aux numéros du responsable** (chaque responsable a son Wave / Orange Money), ou en espèces.
- **Le groupe peut être découpé** : les places sont attribuées une par une, bus 1 d'abord, puis bus 2, etc.
  Le membre ne choisit jamais son bus.
- **Le membre déclare son paiement, le responsable valide** (acompte possible). Tout est daté et signé.

## Fonctionnement
- Membre : indique le nom de chaque passager (bouton « Moi » pour lui-même), réserve, voit le bus de chaque
  passager, le montant dû, ce qui est validé, et le nom + contact + numéros des responsables.
  Il peut modifier ou annuler tant qu'aucun paiement n'a été validé ; ensuite il passe par un responsable.
- Statuts : En attente → Acceptée → Acompte reçu → Payée (ou Annulée).
- Responsable : un « Espace bus » (menu Mon espace) avec, par événement, les bus et leurs passagers,
  les réservations, les paiements à vérifier (valider / refuser), l'enregistrement direct d'un paiement en
  espèces, l'acceptation d'une réservation, le changement de bus d'un passager, la réservation pour une
  personne sans téléphone, les totaux encaissés / restants et l'impression de la liste.
- Prix par place fixé sur l'événement (vide ou 0 = gratuit, pas de partie paiement).

## Laissé au constructeur (choix faits)
- Numéros Wave / Orange Money du responsable pré-remplis avec son téléphone, modifiables dans son espace.
- Pas d'API Wave / Orange Money pour l'instant : paiement déclaré puis validé à la main.
- 10 passagers maximum par réservation.
