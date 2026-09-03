import { Timestamp } from "firebase/firestore";

export type DealStatus = "aberto" | "ganho" | "perdido";

export interface IDeal {
  id: string;
  companyId: string;
  contactId: string;
  contactName: string;
  title: string;
  estimatedValue: number;
  status: DealStatus;
  convertedToContractId?: string;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type DealInput = Pick<
  IDeal,
  "contactId" | "contactName" | "title" | "estimatedValue" | "status" | "notes"
>;
