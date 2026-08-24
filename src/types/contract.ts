import { Timestamp } from "firebase/firestore";

export type ContractStatus = "rascunho" | "ativo" | "encerrado" | "cancelado";

export interface IContract {
  id: string;
  companyId: string;
  title: string;
  contactId: string;
  contactName: string;
  value: number;
  status: ContractStatus;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ContractInput = Pick<
  IContract,
  | "title"
  | "contactId"
  | "contactName"
  | "value"
  | "status"
  | "startDate"
  | "endDate"
  | "notes"
>;
