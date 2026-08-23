import { Timestamp } from "firebase/firestore";

export type QualityCheckStatus = "pendente" | "aprovado" | "reprovado";

export interface IQualityCheck {
  id: string;
  item: string;
  category: string;
  inspector?: string;
  inspectionDate: Timestamp | null;
  status: QualityCheckStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type QualityCheckInput = Pick<
  IQualityCheck,
  "item" | "category" | "inspector" | "inspectionDate" | "status" | "notes"
>;
