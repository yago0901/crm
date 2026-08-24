import { Timestamp } from "firebase/firestore";

export type EmployeeStatus = "ativo" | "ferias" | "desligado";

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
  notes?: string;
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
  | "notes"
>;
