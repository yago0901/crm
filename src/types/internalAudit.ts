import { Timestamp } from "firebase/firestore";

export type InternalAuditStatus = "planejada" | "em_andamento" | "concluida";

export interface IInternalAudit {
  id: string;
  title: string;
  department: string;
  auditor?: string;
  auditDate: Timestamp | null;
  status: InternalAuditStatus;
  findings?: string;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type InternalAuditInput = Pick<
  IInternalAudit,
  "title" | "department" | "auditor" | "auditDate" | "status" | "findings" | "notes"
>;
