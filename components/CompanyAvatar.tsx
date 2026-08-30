// Renders a colored circular badge with the company's first letter —
// the lightweight "logo" every company gets without needing any image
// upload infrastructure. Used anywhere a company name is listed
// alongside others (hub, standings, match lobby, nav) so two entries
// read as visually distinct, not just different text.
export function CompanyAvatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-14 w-14 text-xl",
  }[size];

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`${sizeClasses} shrink-0 rounded-full flex items-center justify-center font-display font-bold text-bp-bg`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </div>
  );
}
