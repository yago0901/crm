import { Timestamp } from "firebase/firestore";

export type ContactStatus = "lead" | "cliente" | "inativo";

export type InteractionType = "ligacao" | "email" | "reuniao" | "nota";

export interface IContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  status: ContactStatus;
  tags?: string[];
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastInteractionAt: Timestamp | null;
}

export type ContactInput = Pick<
  IContact,
  "name" | "email" | "phone" | "company" | "role" | "status" | "tags" | "notes"
>;

export interface IInteraction {
  id: string;
  type: InteractionType;
  description: string;
  createdAt: Timestamp | null;
  createdBy: string;
  createdByName?: string;
}

export type InteractionInput = Pick<IInteraction, "type" | "description">;
