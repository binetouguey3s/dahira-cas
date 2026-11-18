from django.db import migrations


def superusers_vers_admin_general(apps, schema_editor):
    """Les super-administrateurs déjà créés (en local et sur Render) passent Admin général."""
    Membre = apps.get_model("comptes", "Membre")
    Membre.objects.filter(is_superuser=True, role="membre").update(role="admin_general")


class Migration(migrations.Migration):
    dependencies = [("comptes", "0002_langue_espagnol")]

    operations = [migrations.RunPython(superusers_vers_admin_general, migrations.RunPython.noop)]
