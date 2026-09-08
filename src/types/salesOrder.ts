import { Timestamp } from "firebase/firestore";

export type SalesOrderStatus = "rascunho" | "aprovado" | "cancelado";

export interface ISalesOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export interface ISalesOrder {
  id: string;
  companyId: string;
  contactId: string;
  contactName: string;
  proposalId?: string;
  dealId?: string;
  warehouseId?: string;
  warehouseName?: string;
  items: ISalesOrderItem[];
  total: number;
  status: SalesOrderStatus;
  approvedProcessedAt?: Timestamp | null;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type SalesOrderInput = Pick<
  ISalesOrder,
  | "contactId"
  | "contactName"
  | "proposalId"
  | "dealId"
  | "warehouseId"
  | "warehouseName"
  | "items"
  | "total"
  | "status"
  | "notes"
>;
