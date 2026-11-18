import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Ton = "succes" | "erreur" | "info";

interface Toast {
  id: number;
  message: string;
  ton: Ton;
}

interface ToastContextValue {
  notifier: (message: string, ton?: Ton) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONES = { succes: CheckCircle2, erreur: XCircle, info: Info };
const COULEURS = {
  succes: "text-status-success",
  erreur: "text-status-error",
  info: "text-accent-secondary",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notifier = useCallback((message: string, ton: Ton = "succes") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, ton }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ton === "erreur" ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ notifier }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icone = ICONES[toast.ton];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-glass-border bg-glass-bg-strong px-4 py-3 text-sm font-medium text-text-primary shadow-xl backdrop-blur-md"
                role={toast.ton === "erreur" ? "alert" : "status"}
              >
                <Icone className={`h-5 w-5 shrink-0 ${COULEURS[toast.ton]}`} />
                {toast.message}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return ctx;
}
