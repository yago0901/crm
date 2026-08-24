import { Timestamp } from "firebase/firestore";

export type ProjectStatus = "planejamento" | "em_andamento" | "concluido" | "cancelado";

export interface IProject {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  budget: number;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  status: ProjectStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ProjectInput = Pick<
  IProject,
  "name" | "description" | "budget" | "startDate" | "endDate" | "status" | "notes"
>;
