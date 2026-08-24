import { Timestamp } from "firebase/firestore";

export type DepartmentInitiativeStatus = "proposta" | "em_andamento" | "concluida";

export interface IDepartmentInitiative {
  id: string;
  companyId: string;
  title: string;
  departments: string;
  description?: string;
  leadName?: string;
  status: DepartmentInitiativeStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type DepartmentInitiativeInput = Pick<
  IDepartmentInitiative,
  "title" | "departments" | "description" | "leadName" | "status" | "notes"
>;
