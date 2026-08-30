import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  highlighted?: boolean;
}

export function Card({
  highlighted,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl bg-bp-surface p-5 transition-all duration-200",
        highlighted
          ? "border border-bp-gold shadow-gold-glow"
          : "border border-bp-border",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
