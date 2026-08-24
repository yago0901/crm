import { Timestamp } from "firebase/firestore";

export type ResourceAllocationStatus = "ativa" | "encerrada";

export interface IResourceAllocation {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  employeeId: string;
  employeeName: string;
  role: string;
  allocationPercent: number;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  status: ResourceAllocationStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ResourceAllocationInput = Pick<
  IResourceAllocation,
  | "projectId"
  | "projectName"
  | "employeeId"
  | "employeeName"
  | "role"
  | "allocationPercent"
  | "startDate"
  | "endDate"
  | "status"
  | "notes"
>;
