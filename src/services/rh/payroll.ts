import {
  collection,
  doc,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
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

function competenciaToDueDate(competencia: string): Timestamp | null {
  const match = /^(\d{4})-(\d{2})$/.exec(competencia);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return Timestamp.fromDate(new Date(year, month, 5));
}

export async function createPayrollEntry(
  input: PayrollEntryInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  const companyId = getCurrentCompanyId();
  const entryRef = doc(collection(firestore, "payrollEntries"));
  const payableRef = doc(collection(firestore, "payables"));

  const batch = writeBatch(firestore);
  batch.set(entryRef, {
    ...input,
    companyId,
    paidAt: null,
    ownerId: owner.uid,
    ownerName: owner.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(payableRef, {
    companyId,
    description: `Folha de pagamento: ${input.employeeName} (${input.competencia})`,
    supplier: input.employeeName,
    category: "Folha de Pagamento",
    value: input.netValue,
    dueDate: competenciaToDueDate(input.competencia),
    paidAt: null,
    status: "pendente",
    notes: "Gerado automaticamente a partir de um lançamento de folha de pagamento.",
    ownerId: owner.uid,
    ownerName: owner.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return entryRef.id;
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
