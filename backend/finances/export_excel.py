"""Export Excel (.xlsx) des cotisations d'une année : tableau des membres × mois, et détail des paiements."""

from decimal import Decimal
from io import BytesIO

from django.db.models import Q
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from comptes.models import Membre

from .models import Cotisation

MOIS = ["Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."]
MOYENS = {"wave": "Wave", "orange_money": "Orange Money", "autre": "Autre"}

VERT_FONCE = "0B3D2E"
OR = "BFA05A"
FOND = {
    "paye": PatternFill("solid", fgColor="D6F0E2"),
    "en_retard": PatternFill("solid", fgColor="F8D7D3"),
    "non_paye": PatternFill("solid", fgColor="FBF1DC"),
}
TEXTE = {"paye": "Payé", "en_retard": "Retard", "non_paye": "À payer"}
TITRE = Font(bold=True, size=14, color=VERT_FONCE)
ENTETE = Font(bold=True, color="FFFFFF")
FOND_ENTETE = PatternFill("solid", fgColor=VERT_FONCE)
TRAIT = Side(style="thin", color="D6E4DD")
BORDURE = Border(left=TRAIT, right=TRAIT, top=TRAIT, bottom=TRAIT)
CENTRE = Alignment(horizontal="center", vertical="center")


def _entetes(feuille, ligne, titres, largeurs):
    for col, (titre, largeur) in enumerate(zip(titres, largeurs), start=1):
        cellule = feuille.cell(row=ligne, column=col, value=titre)
        cellule.font, cellule.fill, cellule.alignment, cellule.border = ENTETE, FOND_ENTETE, CENTRE, BORDURE
        feuille.column_dimensions[get_column_letter(col)].width = largeur
    feuille.freeze_panes = feuille.cell(row=ligne + 1, column=3)


def classeur_annee(annee, nom_dahira="Dahira"):
    cotisations = list(
        Cotisation.objects.filter(annee=annee, archive_le__isnull=True).select_related("membre").order_by("mois")
    )
    par_membre = {}
    for c in cotisations:
        par_membre.setdefault(c.membre_id, {})[c.mois] = c
    membres = (
        Membre.objects.filter(Q(is_active=True) | Q(pk__in=par_membre.keys()))
        .order_by("nom_complet")
        .distinct()
    )

    classeur = Workbook()

    # --- Onglet 1 : tableau de l'année ------------------------------------------------------
    f = classeur.active
    f.title = f"Tableau {annee}"
    f["A1"] = f"{nom_dahira} — cotisations {annee}"
    f["A1"].font = TITRE
    f["A2"] = "Vert : payé · Rouge : en retard · Jaune : à payer · Vide : pas de cotisation ce mois-là"
    f["A2"].font = Font(italic=True, color="6B7570", size=9)
    titres = ["Membre", "N° carte", "Téléphone", "Compte", *MOIS, "Total payé (FCFA)", "Reste dû (FCFA)"]
    _entetes(f, 4, titres, [28, 14, 16, 11, *[8] * 12, 17, 16])
    ligne = 5
    total_paye = total_du = Decimal("0")
    for m in membres:
        mois = par_membre.get(m.pk, {})
        paye = sum((c.montant for c in mois.values() if c.statut == "paye"), Decimal("0"))
        du = sum((c.montant for c in mois.values() if c.statut != "paye"), Decimal("0"))
        total_paye += paye
        total_du += du
        valeurs = [m.nom_complet or m.username, m.carte_numero, m.telephone or "—", "Sans compte" if m.sans_compte else "Inscrit"]
        for col, valeur in enumerate(valeurs, start=1):
            cellule = f.cell(row=ligne, column=col, value=valeur)
            cellule.border = BORDURE
        for numero in range(1, 13):
            c = mois.get(numero)
            cellule = f.cell(row=ligne, column=4 + numero, value=TEXTE[c.statut] if c else "")
            cellule.alignment, cellule.border = CENTRE, BORDURE
            if c:
                cellule.fill = FOND[c.statut]
        for col, valeur in ((17, paye), (18, du)):
            cellule = f.cell(row=ligne, column=col, value=float(valeur))
            cellule.number_format = "#,##0"
            cellule.border = BORDURE
            if col == 18 and valeur:
                cellule.font = Font(bold=True, color="C0392B")
        ligne += 1
    f.cell(row=ligne, column=1, value="TOTAL").font = Font(bold=True, color=VERT_FONCE)
    for col, valeur in ((17, total_paye), (18, total_du)):
        cellule = f.cell(row=ligne, column=col, value=float(valeur))
        cellule.number_format = "#,##0"
        cellule.font = Font(bold=True, color=VERT_FONCE)
        cellule.border = Border(top=Side(style="medium", color=OR))
    f.auto_filter.ref = f"A4:{get_column_letter(len(titres))}{max(ligne - 1, 4)}"

    # --- Onglet 2 : détail des paiements ----------------------------------------------------
    d = classeur.create_sheet(f"Paiements {annee}")
    d["A1"] = f"Paiements reçus — {annee}"
    d["A1"].font = TITRE
    _entetes(d, 3, ["Date du paiement", "Membre", "N° carte", "Mois", "Montant (FCFA)", "Moyen", "Référence"], [18, 28, 14, 10, 15, 15, 24])
    d.freeze_panes = "A4"
    ligne = 4
    payees = sorted((c for c in cotisations if c.statut == "paye"), key=lambda c: (c.date_paiement is None, c.date_paiement, c.mois))
    for c in payees:
        valeurs = [
            timezone.localtime(c.date_paiement).replace(tzinfo=None) if c.date_paiement else None,
            c.membre.nom_complet,
            c.membre.carte_numero,
            MOIS[c.mois - 1],
            float(c.montant),
            MOYENS.get(c.moyen_paiement, ""),
            c.reference_transaction,
        ]
        for col, valeur in enumerate(valeurs, start=1):
            cellule = d.cell(row=ligne, column=col, value=valeur)
            cellule.border = BORDURE
        d.cell(row=ligne, column=1).number_format = "dd/mm/yyyy hh:mm"
        d.cell(row=ligne, column=5).number_format = "#,##0"
        ligne += 1
    d.cell(row=ligne, column=4, value="TOTAL").font = Font(bold=True, color=VERT_FONCE)
    cellule = d.cell(row=ligne, column=5, value=float(sum((c.montant for c in payees), Decimal("0"))))
    cellule.number_format = "#,##0"
    cellule.font = Font(bold=True, color=VERT_FONCE)

    tampon = BytesIO()
    classeur.save(tampon)
    return tampon.getvalue()
