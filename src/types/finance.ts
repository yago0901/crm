import { Timestamp } from "firebase/firestore";

export type FinanceStatus =
  | "pendente"
  | "parcialmente_pago"
  | "pago"
  | "atrasado"
  | "cancelado"
  | "renegociado"
  | "estornado";

export type PaymentMethod =
  | "boleto"
  | "pix"
  | "cartao"
  | "transferencia"
  | "dinheiro"
  | "outro";

export interface IPayable {
  id: string;
  companyId: string;
  description: string;
  supplier: string;
  category: string;
  value: number;
  paidValue?: number;
  dueDate: Timestamp | null;
  competenceDate: Timestamp | null;
  paidAt: Timestamp | null;
  status: FinanceStatus;
  paymentMethod: PaymentMethod | "";
  bankAccount?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type PayableInput = Pick<
  IPayable,
  | "description"
  | "supplier"
  | "category"
  | "value"
  | "paidValue"
  | "dueDate"
  | "competenceDate"
  | "paidAt"
  | "status"
  | "paymentMethod"
  | "bankAccount"
  | "notes"
>;

export interface IReceivable {
  id: string;
  companyId: string;
  description: string;
  contactId: string;
  contactName: string;
  category: string;
  value: number;
  paidValue?: number;
  dueDate: Timestamp | null;
  competenceDate: Timestamp | null;
  receivedAt: Timestamp | null;
  status: FinanceStatus;
  paymentMethod: PaymentMethod | "";
  bankAccount?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ReceivableInput = Pick<
  IReceivable,
  | "description"
  | "contactId"
  | "contactName"
  | "category"
  | "value"
  | "paidValue"
  | "dueDate"
  | "competenceDate"
  | "receivedAt"
  | "status"
  | "paymentMethod"
  | "bankAccount"
  | "notes"
>;

export interface IInstallmentPlan {
  count: number;
  intervalDays: number;
}
