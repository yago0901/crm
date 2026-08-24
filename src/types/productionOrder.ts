import { Timestamp } from "firebase/firestore";

export type ProductionOrderStatus = "pendente" | "em_producao" | "concluida" | "cancelada";

export interface IProductionOrder {
  id: string;
  companyId: string;
  description: string;
  productName: string;
  quantity: number;
  status: ProductionOrderStatus;
  dueDate: Timestamp | null;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ProductionOrderInput = Pick<
  IProductionOrder,
  "description" | "productName" | "quantity" | "status" | "dueDate" | "notes"
>;
