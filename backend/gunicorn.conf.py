"""Réglages du serveur gunicorn (chargés automatiquement au démarrage sur Render).

Un seul processus, plusieurs fils : le serveur gratuit a très peu de puissance de calcul, et le temps
d'une requête est surtout de l'attente (base de données, Cloudinary, DeepL, Brevo). Les fils permettent
de servir plusieurs visiteurs en même temps, tout en gardant une seule mémoire partagée : limites
anti-abus (10 essais de connexion par minute) et paramètres du site en cache restent cohérents.
"""

import os

# Toujours 1 processus (même si l'hébergeur définit WEB_CONCURRENCY) : voir ci-dessus.
workers = 1
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", 8))
timeout = 120  # envoi de grosses vidéos depuis une connexion lente
graceful_timeout = 30
keepalive = 5
