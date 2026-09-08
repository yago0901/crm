import { Timestamp } from "firebase/firestore";

export type ProposalStatus = "rascunho" | "enviada" | "aceita" | "recusada" | "expirada";

export interface IProposalItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface IProposal {
  id: string;
  companyId: string;
  contactId: string;
  contactName: string;
  dealId?: string;
  dealTitle?: string;
  items: IProposalItem[];
  total: number;
  validUntil: Timestamp | null;
  status: ProposalStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ProposalInput = Pick<
  IProposal,
  | "contactId"
  | "contactName"
  | "dealId"
  | "dealTitle"
  | "items"
  | "total"
  | "validUntil"
  | "status"
  | "notes"
>;
