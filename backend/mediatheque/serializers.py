from rest_framework import serializers

from .models import ContenuMedia

TAILLE_MAX_FICHIER = 100 * 1024 * 1024  # 100 Mo


class ContenuMediaSerializer(serializers.ModelSerializer):
    archive_par_nom = serializers.CharField(source="archive_par.nom_complet", read_only=True, default="")
    aime = serializers.SerializerMethodField()
    evenement_titre = serializers.CharField(source="evenement.titre", read_only=True, default=None)

    class Meta:
        model = ContenuMedia
        fields = [
            "archive_le",
            "archive_par_nom",
            "id",
            "titre",
            "description",
            "type",
            "fichier",
            "url_externe",
            "auteur",
            "categorie",
            "categorie_autre",
            "evenement",
            "evenement_titre",
            "nb_likes",
            "nb_telechargements",
            "aime",
            "date_publication",
        ]
        read_only_fields = ["archive_le", "id", "nb_likes", "nb_telechargements", "date_publication"]

    def get_aime(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(membre=request.user).exists()

    def validate_fichier(self, fichier):
        if fichier and fichier.size > TAILLE_MAX_FICHIER:
            raise serializers.ValidationError("Le fichier ne doit pas dépasser 100 Mo.")
        return fichier

    def validate(self, attrs):
        type_ = attrs.get("type", getattr(self.instance, "type", None))
        fichier = attrs.get("fichier", getattr(self.instance, "fichier", None))
        url = attrs.get("url_externe", getattr(self.instance, "url_externe", ""))
        description = attrs.get("description", getattr(self.instance, "description", ""))
        if type_ in ("audio", "video") and not (fichier or url):
            raise serializers.ValidationError("Ajoutez un fichier ou un lien (YouTube, SoundCloud…).")
        if type_ == "texte" and not description:
            raise serializers.ValidationError({"description": "Le texte de l'enseignement est obligatoire."})
        # Catégorie : reprise de l'événement lié si elle n'est pas choisie ; précision seulement pour « Autre ».
        evenement = attrs.get("evenement", getattr(self.instance, "evenement", None))
        categorie = attrs.get("categorie", getattr(self.instance, "categorie", ""))
        if not categorie and evenement and "categorie" not in attrs:
            attrs["categorie"] = categorie = evenement.categorie
        if categorie != "autre":
            attrs["categorie_autre"] = ""
        else:
            attrs["categorie_autre"] = attrs.get("categorie_autre", getattr(self.instance, "categorie_autre", "")).strip()
        return attrs
