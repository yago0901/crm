import { Timestamp } from "firebase/firestore";

export type WarehouseStatus = "ativo" | "inativo";

export interface IWarehouse {
  id: string;
  companyId: string;
  name: string;
  address?: string;
  capacity: number;
  manager?: string;
  status: WarehouseStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type WarehouseInput = Pick<
  IWarehouse,
  "name" | "address" | "capacity" | "manager" | "status" | "notes"
>;
