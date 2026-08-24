import { Timestamp } from "firebase/firestore";

export type InventoryItemStatus = "ativo" | "descontinuado";

export interface IInventoryItem {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  unitCost: number;
  status: InventoryItemStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type InventoryItemInput = Pick<
  IInventoryItem,
  | "name"
  | "sku"
  | "category"
  | "quantity"
  | "minQuantity"
  | "unit"
  | "unitCost"
  | "status"
  | "notes"
>;
