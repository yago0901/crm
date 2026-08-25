export const ALL_MODULE_KEYS = [
  "sales",
  "financial",
  "human-resources",
  "inventory-logistics",
  "production",
  "projects",
  "business-intelligence",
  "compliance",
  "collaboration",
] as const;

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];
