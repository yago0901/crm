import { Timestamp } from "firebase/firestore";

export type PerformanceReviewStatus = "rascunho" | "finalizada";

export type DevelopmentActionStatus = "pendente" | "em_andamento" | "concluida";

export interface ICompetencyRating {
  name: string;
  weight: number;
  selfScore: number;
  managerScore: number;
}

export interface IDevelopmentAction {
  action: string;
  deadline: Timestamp | null;
  status: DevelopmentActionStatus;
}

export interface IIndividualGoal {
  description: string;
  weight: number;
  progressPercent: number;
}

export interface IPerformanceReview {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  period: string;
  score: number;
  strengths?: string;
  improvements?: string;
  competencies?: ICompetencyRating[];
  developmentPlan?: IDevelopmentAction[];
  goals?: IIndividualGoal[];
  status: PerformanceReviewStatus;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type PerformanceReviewInput = Pick<
  IPerformanceReview,
  | "employeeId"
  | "employeeName"
  | "period"
  | "score"
  | "strengths"
  | "improvements"
  | "competencies"
  | "developmentPlan"
  | "goals"
  | "status"
>;
