import { Timestamp } from "firebase/firestore";

export type StockMovementType = "entrada" | "saida" | "ajuste" | "inventario" | "perda" | "devolucao";

export interface IStockMovement {
  id: string;
  companyId: string;
  itemId: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
}
