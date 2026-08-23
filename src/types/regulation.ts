import { Timestamp } from "firebase/firestore";

export type RegulationStatus = "pendente" | "atendido" | "vencido";

export interface IRegulation {
  id: string;
  name: string;
  category: string;
  responsible?: string;
  deadline: Timestamp | null;
  status: RegulationStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type RegulationInput = Pick<
  IRegulation,
  "name" | "category" | "responsible" | "deadline" | "status" | "notes"
>;
