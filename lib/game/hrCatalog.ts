export const ROLE_CATALOG = {
  commercial: { label: "Sales rep", defaultSalary: 800 },
  chauffeur: { label: "Driver", defaultSalary: 600 },
  magasinier: { label: "Warehouse keeper", defaultSalary: 500 },
} as const;

export type CommercialRole = keyof typeof ROLE_CATALOG;

export const TRAINING_COST = 350;
export const TRAINING_COMPETENCY_GAIN = 20;
