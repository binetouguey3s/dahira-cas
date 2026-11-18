import { motion } from "motion/react";
import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

export default function Introuvable() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <div className="flex flex-col items-center py-16 text-center">
        <motion.div
          animate={{ rotate: [0, 15, -10, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1 }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-soft text-accent-primary"
        >
          <Compass className="h-10 w-10" />
        </motion.div>
        <p className="text-6xl font-bold text-accent-primary">404</p>
        <h1 className="mt-2 text-xl font-bold text-text-primary">{t("introuvable.titre")}</h1>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">{t("introuvable.message")}</p>
        <Button asChild className="mt-6">
          <Link to="/">{t("nav.accueil")}</Link>
        </Button>
      </div>
    </AppShell>
  );
}
