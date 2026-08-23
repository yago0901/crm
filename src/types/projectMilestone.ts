import { Timestamp } from "firebase/firestore";

export type ProjectMilestoneStatus = "pendente" | "concluido" | "atrasado";

export interface IProjectMilestone {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  dueDate: Timestamp | null;
  estimatedCost: number;
  actualCost: number;
  status: ProjectMilestoneStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ProjectMilestoneInput = Pick<
  IProjectMilestone,
  | "projectId"
  | "projectName"
  | "title"
  | "dueDate"
  | "estimatedCost"
  | "actualCost"
  | "status"
  | "notes"
>;
