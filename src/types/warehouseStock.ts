import { Timestamp } from "firebase/firestore";

export interface IWarehouseStock {
  id: string;
  companyId: string;
  itemId: string;
  itemName: string;
  warehouseId: string;
  quantity: number;
  updatedAt: Timestamp | null;
}
