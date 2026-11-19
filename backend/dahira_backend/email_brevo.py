"""Envoi des e-mails par l'API web de Brevo.

L'offre gratuite de Render bloque les ports SMTP : on passe donc par HTTPS
(https://api.brevo.com/v3/smtp/email), ce qui marche partout.
"""

import json
import logging
import urllib.error
import urllib.request
from email.utils import parseaddr

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

URL_BREVO = "https://api.brevo.com/v3/smtp/email"


class BrevoEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        envoyes = 0
        for message in email_messages:
            nom, adresse = parseaddr(message.from_email or settings.DEFAULT_FROM_EMAIL)
            corps = {
                "sender": {"email": adresse, "name": nom or settings.EMAIL_NOM_EXPEDITEUR},
                "to": [{"email": a} for a in message.to],
                "subject": message.subject,
                "textContent": message.body,
            }
            for contenu, type_mime in getattr(message, "alternatives", []):
                if type_mime == "text/html":
                    corps["htmlContent"] = contenu
            if message.reply_to:
                corps["replyTo"] = {"email": message.reply_to[0]}
            requete = urllib.request.Request(
                URL_BREVO,
                data=json.dumps(corps).encode("utf-8"),
                headers={
                    "api-key": settings.BREVO_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(requete, timeout=15):
                    envoyes += 1
            except urllib.error.HTTPError as erreur:
                logger.error("Brevo a refusé l'e-mail (%s) : %s", erreur.code, erreur.read()[:500])
                if erreur.code == 401:
                    cle = settings.BREVO_API_KEY
                    logger.error(
                        "Clé Brevo refusée. Elle doit être une clé API (commence par « xkeysib- »)%s.",
                        " — celle-ci est une clé SMTP (« xsmtpsib- »)" if cle.startswith("xsmtpsib-") else
                        f" — celle-ci commence par « {cle[:8]} » et fait {len(cle)} caractères",
                    )
                if not self.fail_silently:
                    raise
            except (urllib.error.URLError, TimeoutError) as erreur:
                logger.error("Brevo injoignable : %s", erreur)
                if not self.fail_silently:
                    raise
        return envoyes
