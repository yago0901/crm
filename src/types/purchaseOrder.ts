import { Timestamp } from "firebase/firestore";

export type PurchaseOrderStatus = "pendente" | "aprovado" | "recebido" | "cancelado";

export interface IPurchaseOrder {
  id: string;
  companyId: string;
  supplierId: string;
  supplierName: string;
  description: string;
  value: number;
  status: PurchaseOrderStatus;
  orderDate: Timestamp | null;
  expectedDate: Timestamp | null;
  notes?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  quantity?: number;
  warehouseId?: string;
  warehouseName?: string;
  receivedProcessedAt: Timestamp | null;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type PurchaseOrderInput = Pick<
  IPurchaseOrder,
  | "supplierId"
  | "supplierName"
  | "description"
  | "value"
  | "status"
  | "orderDate"
  | "expectedDate"
  | "notes"
  | "inventoryItemId"
  | "inventoryItemName"
  | "quantity"
  | "warehouseId"
  | "warehouseName"
>;
