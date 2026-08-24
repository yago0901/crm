import { Timestamp } from "firebase/firestore";

export type ShipmentStatus = "preparando" | "em_transito" | "entregue" | "cancelado";

export interface IShipment {
  id: string;
  companyId: string;
  description: string;
  destination: string;
  carrier?: string;
  trackingCode?: string;
  status: ShipmentStatus;
  shipDate: Timestamp | null;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ShipmentInput = Pick<
  IShipment,
  | "description"
  | "destination"
  | "carrier"
  | "trackingCode"
  | "status"
  | "shipDate"
  | "notes"
>;
