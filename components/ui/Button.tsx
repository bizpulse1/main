import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-bp-gold text-[#0A0F1D] font-semibold hover:shadow-gold-glow disabled:bg-bp-gold-dim disabled:text-bp-text-muted disabled:shadow-none disabled:cursor-not-allowed",
  outline:
    "border border-bp-gold text-bp-gold hover:bg-bp-gold/10 disabled:border-bp-border disabled:text-bp-text-muted disabled:cursor-not-allowed",
  ghost:
    "text-bp-text hover:bg-bp-surface-raised disabled:text-bp-text-muted disabled:cursor-not-allowed",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          "rounded-xl px-6 py-4 text-base transition-all duration-200",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bp-gold",
          fullWidth ? "w-full" : "",
          variantClasses[variant],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
