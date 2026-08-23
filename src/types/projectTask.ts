import { Timestamp } from "firebase/firestore";

export type ProjectTaskStatus = "a_fazer" | "em_andamento" | "concluida";

export interface IProjectTask {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  assignee?: string;
  dueDate: Timestamp | null;
  status: ProjectTaskStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ProjectTaskInput = Pick<
  IProjectTask,
  "projectId" | "projectName" | "title" | "assignee" | "dueDate" | "status" | "notes"
>;
