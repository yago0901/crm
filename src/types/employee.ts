import { Timestamp } from "firebase/firestore";

export type EmployeeStatus = "ativo" | "ferias" | "desligado";

export type ContractType =
  | "clt"
  | "pj"
  | "estagio"
  | "temporario"
  | "terceirizado";

export interface IJobHistoryEntry {
  effectiveDate: Timestamp | null;
  role: string;
  salary: number;
  reason: string;
}

export interface IEmployee {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  status: EmployeeStatus;
  salary: number;
  hireDate: Timestamp | null;
  commissionRate?: number;
  costPerHour?: number;
  managerId?: string;
  managerName?: string;
  contractType?: ContractType | "";
  costCenter?: string;
  weeklyHours?: number;
  jobHistory?: IJobHistoryEntry[];
  notes?: string;
  userId: string | null;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type EmployeeInput = Pick<
  IEmployee,
  | "name"
  | "email"
  | "phone"
  | "role"
  | "department"
  | "status"
  | "salary"
  | "hireDate"
  | "commissionRate"
  | "costPerHour"
  | "managerId"
  | "managerName"
  | "contractType"
  | "costCenter"
  | "weeklyHours"
  | "jobHistory"
  | "notes"
>;
