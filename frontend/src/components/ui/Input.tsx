import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

const BASE =
  "w-full rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated text-sm text-text-primary placeholder:text-text-secondary/60 transition-[border-color,box-shadow] duration-200 hover:border-border-default focus:border-accent-primary focus:outline-none focus:ring-4 focus:ring-accent-primary/15 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(BASE, "h-12 px-4", className)} {...props} />,
);
Input.displayName = "Input";

export const MotDePasseInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { libelleAfficher?: string }>(
  ({ className, libelleAfficher = "Afficher", ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input ref={ref} type={visible ? "text" : "password"} className={cn(BASE, "h-12 pe-12 ps-4", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={libelleAfficher}
          className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-text-secondary hover:text-text-primary"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
MotDePasseInput.displayName = "MotDePasseInput";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(BASE, "resize-y px-4 py-3", className)} {...props} />,
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(BASE, "h-12 cursor-pointer appearance-none bg-[length:16px] bg-[position:right_14px_center] bg-no-repeat pe-10 ps-4 rtl:bg-[position:left_14px_center]", "select-chevron", className)} {...props} />
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-semibold text-text-primary", className)} {...props} />;
}

/** Champ complet : libellé + contrôle + aide/erreur. Le contrôle reçoit l'id via `children(id)`. */
export function Champ({
  label,
  aide,
  erreur,
  optionnel,
  children,
  className,
}: {
  label: ReactNode;
  aide?: ReactNode;
  erreur?: ReactNode;
  optionnel?: string;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optionnel && <span className="ms-1 font-normal text-text-secondary">{optionnel}</span>}
      </Label>
      {children(id)}
      {erreur ? (
        <p className="text-xs font-medium text-status-error">{erreur}</p>
      ) : (
        aide && <p className="text-xs text-text-secondary">{aide}</p>
      )}
    </div>
  );
}

export function Interrupteur({
  coche,
  onChange,
  label,
  description,
}: {
  coche: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[var(--radius-md)] border border-border-subtle p-4 transition-colors hover:bg-bg-secondary/50">
      <span>
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-text-secondary">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={coche}
        onClick={() => onChange(!coche)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          coche ? "bg-accent-primary" : "bg-border-default/50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
            coche ? "start-[22px]" : "start-0.5",
          )}
        />
      </button>
    </label>
  );
}
