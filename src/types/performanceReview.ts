import { Timestamp } from "firebase/firestore";

export type PerformanceReviewStatus = "rascunho" | "finalizada";

export interface IPerformanceReview {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  period: string;
  score: number;
  strengths?: string;
  improvements?: string;
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
  | "status"
>;
