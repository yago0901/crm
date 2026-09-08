import { Timestamp } from "firebase/firestore";

export type DealStatus = "aberto" | "ganho" | "perdido";

export type DealStage =
  | "prospeccao"
  | "qualificacao"
  | "proposta"
  | "negociacao"
  | "fechamento";

export const DEAL_STAGE_ORDER: DealStage[] = [
  "prospeccao",
  "qualificacao",
  "proposta",
  "negociacao",
  "fechamento",
];

export interface IDeal {
  id: string;
  companyId: string;
  contactId: string;
  contactName: string;
  title: string;
  estimatedValue: number;
  status: DealStatus;
  stage: DealStage;
  winProbability: number;
  expectedCloseDate: Timestamp | null;
  lostReason?: string;
  competitor?: string;
  convertedToContractId?: string;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type DealInput = Pick<
  IDeal,
  | "contactId"
  | "contactName"
  | "title"
  | "estimatedValue"
  | "status"
  | "stage"
  | "winProbability"
  | "expectedCloseDate"
  | "lostReason"
  | "competitor"
  | "notes"
>;
