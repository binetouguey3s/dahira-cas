import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-primary text-text-inverse shadow-sm shadow-accent-primary/25 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent-primary/30",
        secondary: "bg-bg-secondary text-text-primary hover:bg-accent-soft",
        outline: "border border-border-subtle bg-transparent text-text-primary hover:border-accent-primary hover:bg-bg-secondary",
        ghost: "text-text-primary hover:bg-bg-secondary",
        danger: "bg-status-error text-white hover:-translate-y-0.5 hover:shadow-md",
        or: "bg-accent-secondary text-[#082019] shadow-sm hover:-translate-y-0.5 hover:shadow-md",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  chargement?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, chargement, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || chargement}
        aria-busy={chargement || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {chargement && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
