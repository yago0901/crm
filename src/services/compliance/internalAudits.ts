import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { IInternalAudit, InternalAuditInput, InternalAuditStatus } from "../../types/internalAudit";

export const mapInternalAudit = (
  snap: QueryDocumentSnapshot<DocumentData>
): IInternalAudit => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    title: data.title,
    department: data.department ?? "",
    auditor: data.auditor ?? "",
    auditDate: data.auditDate ?? null,
    status: data.status,
    findings: data.findings ?? "",
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const internalAuditsService = createCrudService<IInternalAudit, InternalAuditInput>(
  "internalAudits",
  mapInternalAudit,
  { orderByField: "auditDate", orderDirection: "desc" }
);

export function subscribeToInternalAudits(
  status: InternalAuditStatus | "all",
  onChange: (audits: IInternalAudit[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return internalAuditsService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createInternalAudit(
  input: InternalAuditInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return internalAuditsService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updateInternalAudit(
  auditId: string,
  input: Partial<InternalAuditInput>
): Promise<void> {
  return internalAuditsService.update(auditId, input);
}

export async function deleteInternalAudit(auditId: string): Promise<void> {
  return internalAuditsService.remove(auditId);
}

export async function getPlannedAuditsCount(): Promise<number> {
  return internalAuditsService.countByStatus("planejada", getCurrentCompanyId() ?? undefined);
}
