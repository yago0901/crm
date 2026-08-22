import { Timestamp } from "firebase/firestore";

export type FinanceStatus = "pendente" | "pago" | "atrasado";

export interface IPayable {
  id: string;
  description: string;
  supplier: string;
  category: string;
  value: number;
  dueDate: Timestamp | null;
  paidAt: Timestamp | null;
  status: FinanceStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type PayableInput = Pick<
  IPayable,
  "description" | "supplier" | "category" | "value" | "dueDate" | "status" | "notes"
>;

export interface IReceivable {
  id: string;
  description: string;
  contactId: string;
  contactName: string;
  category: string;
  value: number;
  dueDate: Timestamp | null;
  receivedAt: Timestamp | null;
  status: FinanceStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ReceivableInput = Pick<
  IReceivable,
  | "description"
  | "contactId"
  | "contactName"
  | "category"
  | "value"
  | "dueDate"
  | "status"
  | "notes"
>;
