import { Timestamp } from "firebase/firestore";

export type SupplierStatus = "ativo" | "inativo";

export interface ISupplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  category: string;
  status: SupplierStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type SupplierInput = Pick<
  ISupplier,
  "name" | "contactName" | "email" | "phone" | "category" | "status" | "notes"
>;
