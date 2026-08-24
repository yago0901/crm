import { Timestamp } from "firebase/firestore";

export type LedgerEntryType = "debito" | "credito";

export interface ILedgerEntry {
  id: string;
  companyId: string;
  description: string;
  category: string;
  type: LedgerEntryType;
  value: number;
  date: Timestamp | null;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type LedgerEntryInput = Pick<
  ILedgerEntry,
  "description" | "category" | "type" | "value" | "date" | "notes"
>;
