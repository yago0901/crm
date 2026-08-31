import { Timestamp } from "firebase/firestore";

export type CompanyPlan = "trial" | "pago";

export interface ICompany {
  id: string;
  slug: string;
  name: string;
  // Optional business-registration info -- nothing in the app consumes
  // these yet, kept here so a company can fill them in ahead of Fase 3's
  // Mercado Pago billing, which will need cnpj/address for nota fiscal.
  cnpj?: string;
  address?: string;
  phone?: string;
  plan: CompanyPlan;
  trialEndsAt: Timestamp | null;
  maxUsers: number;
  userCount: number;
  primaryUserId: string;
  primaryEmail: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type CompanyInput = Pick<
  ICompany,
  | "slug"
  | "name"
  | "cnpj"
  | "address"
  | "phone"
  | "plan"
  | "trialEndsAt"
  | "maxUsers"
  | "primaryUserId"
  | "primaryEmail"
>;
