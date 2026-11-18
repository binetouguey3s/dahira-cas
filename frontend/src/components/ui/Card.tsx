import { motion, type HTMLMotionProps } from "motion/react";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated p-4 shadow-[0_1px_2px_var(--glass-shadow)]",
        className,
      )}
      {...props}
    />
  );
}

/** Carte cliquable qui se soulève légèrement au survol. */
export function CardInteractive({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "cursor-pointer rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated p-4 shadow-[0_1px_2px_var(--glass-shadow)] transition-[box-shadow,border-color] duration-200 hover:border-accent-primary/40 hover:shadow-[0_12px_32px_-12px_var(--glass-shadow)]",
        className,
      )}
      {...props}
    />
  );
}

type Ton = "neutral" | "success" | "error" | "warning" | "or";

const TONS: Record<Ton, string> = {
  neutral: "bg-bg-secondary text-text-primary",
  success: "bg-accent-soft text-status-success",
  error: "bg-status-error-bg text-status-error",
  warning: "bg-status-warning-bg text-status-warning-text",
  or: "bg-accent-secondary/15 text-accent-secondary-text",
};

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Ton }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        TONS[tone],
        className,
      )}
      {...props}
    />
  );
}
