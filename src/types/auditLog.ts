import { Timestamp } from "firebase/firestore";

export type AuditAction = "update" | "delete";

export interface IAuditFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface IAuditLog {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  entitySummary: string;
  action: AuditAction;
  changedFields: IAuditFieldChange[];
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
}
