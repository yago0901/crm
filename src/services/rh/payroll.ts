import { doc, DocumentData, QueryDocumentSnapshot, serverTimestamp, Unsubscribe, updateDoc } from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { IPayrollEntry, PayrollEntryInput, PayrollStatus } from "../../types/payrollEntry";

export const mapPayrollEntry = (
  snap: QueryDocumentSnapshot<DocumentData>
): IPayrollEntry => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    employeeId: data.employeeId,
    employeeName: data.employeeName ?? "",
    competencia: data.competencia,
    baseSalary: data.baseSalary ?? 0,
    bonuses: data.bonuses ?? 0,
    deductions: data.deductions ?? 0,
    netValue: data.netValue ?? 0,
    status: data.status,
    paidAt: data.paidAt ?? null,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const payrollService = createCrudService<IPayrollEntry, PayrollEntryInput>(
  "payrollEntries",
  mapPayrollEntry,
  { orderByField: "competencia", orderDirection: "desc" }
);

export function subscribeToPayrollEntries(
  status: PayrollStatus | "all",
  onChange: (entries: IPayrollEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return payrollService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createPayrollEntry(
  input: PayrollEntryInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return payrollService.create(input, owner, {
    companyId: getCurrentCompanyId(),
    paidAt: null,
  });
}

export async function updatePayrollEntry(
  entryId: string,
  input: Partial<PayrollEntryInput>
): Promise<void> {
  return payrollService.update(entryId, input);
}

export async function markPayrollEntryPaid(entryId: string): Promise<void> {
  await updateDoc(doc(firestore, "payrollEntries", entryId), {
    status: "pago",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayrollEntry(entryId: string): Promise<void> {
  return payrollService.remove(entryId);
}

export async function getPayrollOpenTotal(): Promise<number> {
  return payrollService.sumByStatus("netValue", "pendente", getCurrentCompanyId() ?? undefined);
}
