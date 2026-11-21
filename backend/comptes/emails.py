"""E-mails envoyés aux membres (dans leur langue préférée)."""

import logging
import threading
from html import escape

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

logger = logging.getLogger(__name__)

TEXTES = {
    "fr": {
        "rappel_sujet": "Rappel de cotisation",
        "rappel_intro": "Sauf erreur de notre part, les cotisations suivantes ne sont pas encore réglées :",
        "rappel_total": "Total à régler : {total} FCFA",
        "rappel_payer": "Vous pouvez payer par {moyens}.",
        "rappel_bouton": "Voir mes cotisations",
        "rappel_deja": "Si vous avez déjà payé, merci de ne pas tenir compte de ce message : le responsable Finance le mettra à jour.",
        "et": " ou ",
        "salut": "Assalamou aleykoum {nom},",
        "reinit_sujet": "Choisir un nouveau mot de passe",
        "reinit_intro": "Vous avez demandé à changer le mot de passe de votre compte ({telephone}).",
        "reinit_bouton": "Choisir un nouveau mot de passe",
        "reinit_validite": "Ce lien est valable 2 heures et ne fonctionne qu'une seule fois.",
        "reinit_ignorer": "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe ne change pas.",
        "bienvenue_sujet": "Bienvenue au Dahira",
        "bienvenue_intro": "Votre compte membre est créé. Vous pouvez désormais suivre les enseignements, vos cotisations et générer votre carte de membre.",
        "bienvenue_bouton": "Ouvrir mon espace",
        "bienvenue_identifiant": "Pour vous connecter, utilisez votre numéro de téléphone : {telephone}.",
        "annonce_sujet": "Nouvel événement : {titre}",
        "annonce_intro": "Le Dahira vous invite :",
        "annonce_date": "Date : {date}",
        "annonce_lieu": "Lieu : {lieu}",
        "annonce_bus": "La réservation des places de bus est ouverte sur le site.",
        "annonce_bouton": "Voir l'événement",
        "annonce_note": "Vous recevez cet e-mail en tant que membre du Dahira. Pour ne plus recevoir les annonces d'événements, désactivez l'option dans votre profil : {lien}",
        "a": "à",
        "signature": "Dalal ak Diam !",
    },
    "en": {
        "rappel_sujet": "Contribution reminder",
        "rappel_intro": "Unless we are mistaken, the following contributions have not been paid yet:",
        "rappel_total": "Total due: {total} FCFA",
        "rappel_payer": "You can pay with {moyens}.",
        "rappel_bouton": "See my contributions",
        "rappel_deja": "If you have already paid, please disregard this message: the finance officer will update it.",
        "et": " or ",
        "salut": "Assalamu alaikum {nom},",
        "reinit_sujet": "Choose a new password",
        "reinit_intro": "You asked to change the password of your account ({telephone}).",
        "reinit_bouton": "Choose a new password",
        "reinit_validite": "This link is valid for 2 hours and works only once.",
        "reinit_ignorer": "If you did not make this request, ignore this email: your password stays the same.",
        "bienvenue_sujet": "Welcome to the Dahira",
        "bienvenue_intro": "Your member account has been created. You can now follow the teachings, your contributions and generate your membership card.",
        "bienvenue_bouton": "Open my space",
        "bienvenue_identifiant": "To sign in, use your phone number: {telephone}.",
        "annonce_sujet": "New event: {titre}",
        "annonce_intro": "The Dahira invites you:",
        "annonce_date": "Date: {date}",
        "annonce_lieu": "Place: {lieu}",
        "annonce_bus": "Bus seat booking is open on the website.",
        "annonce_bouton": "See the event",
        "annonce_note": "You receive this email as a member of the Dahira. To stop receiving event announcements, turn the option off in your profile: {lien}",
        "a": "at",
        "signature": "Dalal ak Diam!",
    },
    "es": {
        "rappel_sujet": "Recordatorio de cuota",
        "rappel_intro": "Salvo error por nuestra parte, las siguientes cuotas aún no están pagadas:",
        "rappel_total": "Total pendiente: {total} FCFA",
        "rappel_payer": "Puedes pagar con {moyens}.",
        "rappel_bouton": "Ver mis cuotas",
        "rappel_deja": "Si ya has pagado, no tengas en cuenta este mensaje: el responsable de finanzas lo actualizará.",
        "et": " o ",
        "salut": "Assalamu alaikum {nom}:",
        "reinit_sujet": "Elige una nueva contraseña",
        "reinit_intro": "Has pedido cambiar la contraseña de tu cuenta ({telephone}).",
        "reinit_bouton": "Elegir una nueva contraseña",
        "reinit_validite": "Este enlace es válido durante 2 horas y solo funciona una vez.",
        "reinit_ignorer": "Si no has hecho esta solicitud, ignora este correo: tu contraseña no cambia.",
        "bienvenue_sujet": "Bienvenido a la Dahira",
        "bienvenue_intro": "Tu cuenta de miembro ha sido creada. Ya puedes seguir las enseñanzas, tus cuotas y generar tu carné de miembro.",
        "bienvenue_bouton": "Abrir mi espacio",
        "bienvenue_identifiant": "Para iniciar sesión, usa tu número de teléfono: {telephone}.",
        "annonce_sujet": "Nuevo evento: {titre}",
        "annonce_intro": "La Dahira te invita:",
        "annonce_date": "Fecha: {date}",
        "annonce_lieu": "Lugar: {lieu}",
        "annonce_bus": "La reserva de plazas de autobús está abierta en el sitio.",
        "annonce_bouton": "Ver el evento",
        "annonce_note": "Recibes este correo como miembro de la Dahira. Para dejar de recibir los anuncios de eventos, desactiva la opción en tu perfil: {lien}",
        "a": "a las",
        "signature": "¡Dalal ak Diam!",
    },
    "ar": {
        "rappel_sujet": "تذكير بالاشتراك",
        "rappel_intro": "ما لم نكن مخطئين، فإن الاشتراكات التالية لم تُسدَّد بعد:",
        "rappel_total": "المجموع المستحق: {total} فرنك",
        "rappel_payer": "يمكنك الدفع عبر {moyens}.",
        "rappel_bouton": "عرض اشتراكاتي",
        "rappel_deja": "إذا كنت قد دفعت بالفعل فتجاهل هذه الرسالة: سيقوم مسؤول المالية بتحديثها.",
        "et": " أو ",
        "salut": "السلام عليكم {nom}،",
        "reinit_sujet": "اختيار كلمة مرور جديدة",
        "reinit_intro": "طلبتَ تغيير كلمة مرور حسابك ({telephone}).",
        "reinit_bouton": "اختيار كلمة مرور جديدة",
        "reinit_validite": "هذا الرابط صالح لمدة ساعتين ويعمل مرة واحدة فقط.",
        "reinit_ignorer": "إذا لم تكن صاحب هذا الطلب فتجاهل هذه الرسالة: كلمة مرورك لن تتغير.",
        "bienvenue_sujet": "مرحبًا بك في الدائرة",
        "bienvenue_intro": "تم إنشاء حسابك. يمكنك الآن متابعة الدروس واشتراكاتك وإنشاء بطاقة العضوية.",
        "bienvenue_bouton": "فتح مساحتي",
        "bienvenue_identifiant": "لتسجيل الدخول استخدم رقم هاتفك: {telephone}.",
        "annonce_sujet": "فعالية جديدة: {titre}",
        "annonce_intro": "تدعوكم الدائرة إلى:",
        "annonce_date": "التاريخ: {date}",
        "annonce_lieu": "المكان: {lieu}",
        "annonce_bus": "حجز مقاعد الحافلات مفتوح على الموقع.",
        "annonce_bouton": "عرض الفعالية",
        "annonce_note": "تصلك هذه الرسالة بصفتك عضوًا في الدائرة. لإيقاف إعلانات الفعاليات، عطّل الخيار في ملفك الشخصي: {lien}",
        "a": "الساعة",
        "signature": "Dalal ak Diam!",
    },
}


MOIS = {
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "es": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    "ar": ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
}


JOURS = {
    "fr": ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
    "en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "es": ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
    "ar": ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
}


def _date_longue(date, langue):
    """« jeudi 26 novembre 2026 à 07:47 » à l'heure de Dakar."""
    from django.utils import timezone

    d = timezone.localtime(date)
    t = TEXTES.get(langue, TEXTES["fr"])
    return f"{JOURS[langue][d.weekday()]} {d.day} {MOIS[langue][d.month - 1]} {d.year} {t['a']} {d:%H:%M}"


def _montant(valeur):
    return f"{int(valeur):,}".replace(",", " ")


def _textes(membre):
    return TEXTES.get(membre.langue_preferee, TEXTES["fr"])


def _html(langue, titre, paragraphes, bouton=None, lien=None, note=None):
    sens = "rtl" if langue == "ar" else "ltr"
    blocs = "".join(f'<p style="margin:0 0 14px;line-height:1.6">{escape(p)}</p>' for p in paragraphes)
    bouton_html = (
        f'<p style="margin:24px 0"><a href="{escape(lien)}" style="display:inline-block;background:#1E7A5D;'
        f'color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">{escape(bouton)}</a></p>'
        if bouton and lien
        else ""
    )
    note_html = f'<p style="margin:0;color:#6b7570;font-size:13px;line-height:1.5">{escape(note)}</p>' if note else ""
    return f"""<!doctype html><html lang="{langue}" dir="{sens}"><body style="margin:0;background:#F4F1E8;font-family:Arial,Helvetica,sans-serif;color:#0B3D2E">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0B3D2E;padding:22px 28px;color:#F3E7C4;font-weight:700;font-size:16px">{escape(settings.EMAIL_NOM_EXPEDITEUR)}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 18px;font-size:20px">{escape(titre)}</h1>{blocs}{bouton_html}{note_html}
</td></tr></table></td></tr></table></body></html>"""


def _email_contact():
    from site_web.models import Parametres

    try:
        return Parametres.charger().email_contact or ""
    except Exception:  # noqa: BLE001 — jamais bloquant pour un envoi
        return ""


def _envoyer(sujet, texte, html, destinataire, en_arriere_plan=None):
    message = EmailMultiAlternatives(
        subject=sujet,
        body=texte,
        from_email=f"{settings.EMAIL_NOM_EXPEDITEUR} <{settings.DEFAULT_FROM_EMAIL}>",
        to=[destinataire],
        # L'adresse d'envoi (no-reply@…) ne reçoit pas de courrier : une réponse du membre part vers
        # l'e-mail de contact du Dahira (Paramètres du site), s'il est renseigné.
        reply_to=[contact] if (contact := _email_contact()) else None,
    )
    message.attach_alternative(html, "text/html")

    def tache():
        try:
            message.send()
        except Exception:  # noqa: BLE001 — un e-mail raté ne doit jamais casser la page
            logger.exception("Envoi d'e-mail impossible vers %s", destinataire)

    if settings.EMAIL_EN_ARRIERE_PLAN if en_arriere_plan is None else en_arriere_plan:
        threading.Thread(target=tache, daemon=True).start()
    else:
        tache()


def lien_reinitialisation(membre):
    uid = urlsafe_base64_encode(force_bytes(membre.pk))
    jeton = default_token_generator.make_token(membre)
    return f"{settings.FRONTEND_URL}/reinitialiser/{uid}/{jeton}"


def envoyer_reinitialisation(membre):
    t = _textes(membre)
    lien = lien_reinitialisation(membre)
    salut = t["salut"].format(nom=membre.nom_complet)
    intro = t["reinit_intro"].format(telephone=membre.telephone or membre.username)
    texte = "\n\n".join([salut, intro, lien, t["reinit_validite"], t["reinit_ignorer"], t["signature"]])
    html = _html(
        membre.langue_preferee,
        t["reinit_sujet"],
        [salut, intro],
        t["reinit_bouton"],
        lien,
        f'{t["reinit_validite"]} {t["reinit_ignorer"]}',
    )
    _envoyer(t["reinit_sujet"], texte, html, membre.email)


def envoyer_bienvenue(membre):
    if not membre.email:
        return
    t = _textes(membre)
    salut = t["salut"].format(nom=membre.nom_complet)
    identifiant = t["bienvenue_identifiant"].format(telephone=membre.telephone)
    lien = f"{settings.FRONTEND_URL}/profil"
    texte = "\n\n".join([salut, t["bienvenue_intro"], identifiant, lien, t["signature"]])
    html = _html(
        membre.langue_preferee, t["bienvenue_sujet"], [salut, t["bienvenue_intro"], identifiant], t["bienvenue_bouton"], lien, t["signature"]
    )
    _envoyer(t["bienvenue_sujet"], texte, html, membre.email)


def envoyer_rappel_cotisation(membre, cotisations, parametres, en_arriere_plan=None):
    """Rappel des cotisations impayées d'un membre, avec le total et les moyens de paiement."""
    t = _textes(membre)
    langue = membre.langue_preferee if membre.langue_preferee in MOIS else "fr"
    salut = t["salut"].format(nom=membre.nom_complet)
    lignes = [f"• {MOIS[langue][c.mois - 1]} {c.annee} : {_montant(c.montant)} FCFA" for c in cotisations]
    total = t["rappel_total"].format(total=_montant(sum(c.montant for c in cotisations)))
    moyens = [f"{nom} ({numero})" for nom, numero in (("Wave", parametres.numero_wave), ("Orange Money", parametres.numero_orange_money)) if numero]
    paragraphes = [salut, t["rappel_intro"], *lignes, total]
    if moyens:
        paragraphes.append(t["rappel_payer"].format(moyens=t["et"].join(moyens)))
    lien = f"{settings.FRONTEND_URL}/cotisations"
    texte = "\n\n".join([*paragraphes, lien, t["rappel_deja"], t["signature"]])
    html = _html(langue, t["rappel_sujet"], paragraphes, t["rappel_bouton"], lien, t["rappel_deja"])
    _envoyer(t["rappel_sujet"], texte, html, membre.email, en_arriere_plan=en_arriere_plan)


def envoyer_annonce_evenement(membre, evenement, titre, description, en_arriere_plan=None):
    """Annonce d'un événement : titre et description déjà traduits dans la langue du membre."""
    t = _textes(membre)
    langue = membre.langue_preferee if membre.langue_preferee in MOIS else "fr"
    paragraphes = [t["salut"].format(nom=membre.nom_complet), t["annonce_intro"], titre]
    paragraphes.append(t["annonce_date"].format(date=_date_longue(evenement.date, langue)))
    if evenement.lieu:
        paragraphes.append(t["annonce_lieu"].format(lieu=evenement.lieu))  # le lieu n'est jamais traduit
    if description:
        resume = description if len(description) <= 400 else description[:400].rsplit(" ", 1)[0] + "…"
        paragraphes.append(resume)
    if evenement.reservation_bus_active:
        paragraphes.append(t["annonce_bus"])
    lien = f"{settings.FRONTEND_URL}/evenements/{evenement.pk}"
    note = t["annonce_note"].format(lien=f"{settings.FRONTEND_URL}/profil")
    sujet = t["annonce_sujet"].format(titre=titre)
    texte = "\n\n".join([*paragraphes, lien, t["signature"], note])
    html = _html(langue, sujet, paragraphes, t["annonce_bouton"], lien, note)
    _envoyer(sujet, texte, html, membre.email, en_arriere_plan=en_arriere_plan)
