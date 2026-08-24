import { Timestamp } from "firebase/firestore";

export type CompanyPlan = "trial" | "pago";

export interface ICompany {
  id: string;
  slug: string;
  name: string;
  plan: CompanyPlan;
  trialEndsAt: Timestamp | null;
  maxUsers: number;
  userCount: number;
  primaryUserId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type CompanyInput = Pick<
  ICompany,
  "slug" | "name" | "plan" | "trialEndsAt" | "maxUsers" | "primaryUserId"
>;
