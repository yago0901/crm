import { Timestamp } from "firebase/firestore";

export type TrainingStatus = "planejado" | "em_andamento" | "concluido" | "cancelado";

export interface ITrainingParticipant {
  employeeId: string;
  employeeName: string;
  attended: boolean;
  score: number;
  certificateIssued: boolean;
}

export interface ITraining {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  category: string;
  date: Timestamp | null;
  status: TrainingStatus;
  participants?: ITrainingParticipant[];
  rating?: number;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type TrainingInput = Pick<
  ITraining,
  | "title"
  | "description"
  | "category"
  | "date"
  | "status"
  | "participants"
  | "rating"
  | "notes"
>;
