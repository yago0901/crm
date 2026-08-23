import { Timestamp } from "firebase/firestore";

export type TrainingStatus = "planejado" | "em_andamento" | "concluido" | "cancelado";

export interface ITraining {
  id: string;
  title: string;
  description?: string;
  category: string;
  date: Timestamp | null;
  status: TrainingStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type TrainingInput = Pick<
  ITraining,
  "title" | "description" | "category" | "date" | "status" | "notes"
>;
