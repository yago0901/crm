import { Timestamp } from "firebase/firestore";

export type MaintenanceRequestStatus = "agendada" | "em_andamento" | "concluida" | "cancelada";

export interface IMaintenanceRequest {
  id: string;
  companyId: string;
  equipmentName: string;
  description: string;
  technician?: string;
  scheduledDate: Timestamp | null;
  status: MaintenanceRequestStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type MaintenanceRequestInput = Pick<
  IMaintenanceRequest,
  "equipmentName" | "description" | "technician" | "scheduledDate" | "status" | "notes"
>;
