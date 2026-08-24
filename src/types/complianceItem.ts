import { Timestamp } from "firebase/firestore";

export type ComplianceStatus = "conforme" | "nao_conforme" | "em_analise";

export interface IComplianceItem {
  id: string;
  companyId: string;
  title: string;
  category: string;
  responsible?: string;
  reviewDate: Timestamp | null;
  status: ComplianceStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ComplianceItemInput = Pick<
  IComplianceItem,
  "title" | "category" | "responsible" | "reviewDate" | "status" | "notes"
>;
