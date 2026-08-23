import { Timestamp } from "firebase/firestore";

export type ProductionPlanStatus = "planejado" | "em_andamento" | "concluido" | "cancelado";

export interface IProductionPlan {
  id: string;
  productName: string;
  targetQuantity: number;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  status: ProductionPlanStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ProductionPlanInput = Pick<
  IProductionPlan,
  "productName" | "targetQuantity" | "startDate" | "endDate" | "status" | "notes"
>;
