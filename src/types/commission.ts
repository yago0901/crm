import { Timestamp } from "firebase/firestore";

export type CommissionStatus = "pendente" | "pago";

export interface ICommission {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  salesOrderId?: string;
  salesOrderReference?: string;
  saleValue: number;
  commissionRate: number;
  commissionValue: number;
  status: CommissionStatus;
  paidAt: Timestamp | null;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type CommissionInput = Pick<
  ICommission,
  | "employeeId"
  | "employeeName"
  | "salesOrderId"
  | "salesOrderReference"
  | "saleValue"
  | "commissionRate"
  | "commissionValue"
  | "status"
  | "notes"
>;
