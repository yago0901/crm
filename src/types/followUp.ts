import { Timestamp } from "firebase/firestore";

export type FollowUpStatus = "pendente" | "concluido" | "cancelado";

export interface IFollowUp {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  contactId?: string;
  contactName?: string;
  dueDate: Timestamp | null;
  status: FollowUpStatus;
  completedAt: Timestamp | null;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type FollowUpInput = Pick<
  IFollowUp,
  "title" | "description" | "contactId" | "contactName" | "dueDate" | "status"
>;
