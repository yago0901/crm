import { Timestamp } from "firebase/firestore";

export type CandidateStatus = "triagem" | "entrevista" | "aprovado" | "reprovado";

export interface ICandidate {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  status: CandidateStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type CandidateInput = Pick<
  ICandidate,
  "name" | "email" | "phone" | "position" | "status" | "notes"
>;
