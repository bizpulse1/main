// Curated palette for a company's identity badge, picked once at
// creation. Deliberately separate from the app's own navy/gold brand
// identity — these need to be visually distinct FROM each other (so
// two companies in a standings list read as different at a glance)
// and readable as white text on top of each, which gold and navy
// alone can't do for 8 distinct companies.
export const COMPANY_COLORS = [
  { hex: "#D4AF37", label: "Gold" },
  { hex: "#4ADE80", label: "Emerald" },
  { hex: "#38BDF8", label: "Sky" },
  { hex: "#FB923C", label: "Coral" },
  { hex: "#A78BFA", label: "Violet" },
  { hex: "#FB7185", label: "Rose" },
  { hex: "#2DD4BF", label: "Teal" },
  { hex: "#94A3B8", label: "Slate" },
] as const;

export const DEFAULT_COMPANY_COLOR = COMPANY_COLORS[0].hex;

export function isValidCompanyColor(hex: string | null | undefined): boolean {
  return COMPANY_COLORS.some((c) => c.hex === hex);
}
