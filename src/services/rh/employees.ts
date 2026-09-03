import {
  DocumentData,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  Unsubscribe,
  where,
  writeBatch,
} from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { firestore } from "../shared/firebase";
import { appendAuditLog } from "../shared/auditLog";
import { setEmployeeAccess } from "./employeeAccess";
import { EmployeeInput, EmployeeStatus, IEmployee } from "../../types/employee";

export const mapEmployee = (
  snap: QueryDocumentSnapshot<DocumentData>
): IEmployee => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    name: data.name,
    email: data.email,
    phone: data.phone ?? "",
    role: data.role,
    department: data.department,
    status: data.status,
    salary: data.salary ?? 0,
    hireDate: data.hireDate ?? null,
    notes: data.notes ?? "",
    userId: data.userId ?? null,
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const employeesService = createCrudService<IEmployee, EmployeeInput>(
  "employees",
  mapEmployee
);

export function subscribeToEmployees(
  status: EmployeeStatus | "all",
  onChange: (employees: IEmployee[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return employeesService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createEmployee(
  input: EmployeeInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return employeesService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updateEmployee(
  employeeId: string,
  input: Partial<EmployeeInput>
): Promise<void> {
  return employeesService.update(employeeId, input);
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  return employeesService.remove(employeeId);
}

export async function getActivePayrollTotal(): Promise<number> {
  return employeesService.sumByStatus("salary", "ativo", getCurrentCompanyId() ?? undefined);
}

export async function fetchActiveEmployees(): Promise<IEmployee[]> {
  const companyId = getCurrentCompanyId();
  const constraints = [
    ...(companyId ? [where("companyId", "==", companyId)] : []),
    where("status", "==", "ativo"),
    orderBy("name", "asc"),
  ];
  const q = query(employeesService.ref, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapEmployee);
}

export interface IUpdateEmployeeResult {
  accessSyncError?: string;
}

export async function updateEmployeeAndSyncAccess(
  employeeId: string,
  input: Partial<EmployeeInput>,
  previousStatus: EmployeeStatus,
  employeeUserId: string | null
): Promise<IUpdateEmployeeResult> {
  await employeesService.update(employeeId, input);

  const isBeingDismissed = previousStatus !== "desligado" && input.status === "desligado";
  if (isBeingDismissed && employeeUserId) {
    try {
      await setEmployeeAccess(employeeUserId, true);
    } catch (err) {
      return {
        accessSyncError: err instanceof Error ? err.message : "Erro ao desativar o acesso.",
      };
    }
  }

  return {};
}

export async function convertCandidateToEmployee(
  candidateId: string,
  input: EmployeeInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  const companyId = getCurrentCompanyId();
  const employeeRef = doc(collection(firestore, "employees"));
  const candidateRef = doc(firestore, "candidates", candidateId);

  const batch = writeBatch(firestore);
  batch.set(employeeRef, {
    ...input,
    companyId,
    userId: null,
    ownerId: owner.uid,
    ownerName: owner.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(candidateRef, {
    convertedToEmployeeId: employeeRef.id,
    updatedAt: serverTimestamp(),
  });

  appendAuditLog(batch, {
    companyId: companyId ?? "",
    entityType: "candidates",
    entityId: candidateId,
    entitySummary: input.name,
    action: "update",
    changedFields: [{ field: "convertedToEmployeeId", before: null, after: employeeRef.id }],
    owner,
  });

  await batch.commit();
  return employeeRef.id;
}
