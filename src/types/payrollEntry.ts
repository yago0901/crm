import { Timestamp } from "firebase/firestore";

export type PayrollStatus = "pendente" | "pago";

export interface IPayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  competencia: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netValue: number;
  status: PayrollStatus;
  paidAt: Timestamp | null;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type PayrollEntryInput = Pick<
  IPayrollEntry,
  | "employeeId"
  | "employeeName"
  | "competencia"
  | "baseSalary"
  | "bonuses"
  | "deductions"
  | "netValue"
  | "status"
  | "notes"
>;
