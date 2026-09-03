import {
  DocumentData,
  DocumentReference,
  QueryDocumentSnapshot,
  collection,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "./firebase";
import { AuditAction, IAuditFieldChange, IAuditLog } from "../../types/auditLog";

const IGNORED_FIELDS = new Set(["updatedAt", "createdAt", "companyId", "ownerId", "ownerName"]);

const SUMMARY_FIELD_CANDIDATES = ["name", "title", "description", "login"];

export function computeChangedFields(
  before: Record<string, unknown>,
  patch: Record<string, unknown>
): IAuditFieldChange[] {
  const changes: IAuditFieldChange[] = [];
  for (const field of Object.keys(patch)) {
    if (IGNORED_FIELDS.has(field)) continue;
    const beforeValue = before[field] ?? null;
    const afterValue = patch[field] ?? null;
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes.push({ field, before: beforeValue, after: afterValue });
    }
  }
  return changes;
}

export function summarizeEntity(
  data: Record<string, unknown> | undefined,
  entityId: string
): string {
  for (const key of SUMMARY_FIELD_CANDIDATES) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return entityId;
}

export interface AppendAuditLogParams {
  companyId: string;
  entityType: string;
  entityId: string;
  entitySummary: string;
  action: AuditAction;
  changedFields: IAuditFieldChange[];
  owner: { uid: string; name?: string | null };
}

export interface AuditLogWriter {
  set(ref: DocumentReference<DocumentData>, data: DocumentData): unknown;
}

export function appendAuditLog(batch: AuditLogWriter, params: AppendAuditLogParams): void {
  const ref = doc(collection(firestore, "auditLogs"));
  batch.set(ref, {
    companyId: params.companyId,
    entityType: params.entityType,
    entityId: params.entityId,
    entitySummary: params.entitySummary,
    action: params.action,
    changedFields: params.changedFields,
    ownerId: params.owner.uid,
    ownerName: params.owner.name ?? "",
    createdAt: serverTimestamp(),
  });
}

export const mapAuditLog = (snap: QueryDocumentSnapshot<DocumentData>): IAuditLog => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    entityType: data.entityType,
    entityId: data.entityId,
    entitySummary: data.entitySummary ?? data.entityId,
    action: data.action,
    changedFields: data.changedFields ?? [],
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
  };
};
