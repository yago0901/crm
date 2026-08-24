import {
  doc,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import {
  FinanceStatus,
  IPayable,
  IReceivable,
  PayableInput,
  ReceivableInput,
} from "../../types/finance";

export const mapPayable = (snap: QueryDocumentSnapshot<DocumentData>): IPayable => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    description: data.description,
    supplier: data.supplier ?? "",
    category: data.category ?? "",
    value: data.value ?? 0,
    dueDate: data.dueDate ?? null,
    paidAt: data.paidAt ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

export const mapReceivable = (
  snap: QueryDocumentSnapshot<DocumentData>
): IReceivable => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    description: data.description,
    contactId: data.contactId ?? "",
    contactName: data.contactName ?? "",
    category: data.category ?? "",
    value: data.value ?? 0,
    dueDate: data.dueDate ?? null,
    receivedAt: data.receivedAt ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const payablesService = createCrudService<IPayable, PayableInput>(
  "payables",
  mapPayable,
  { orderByField: "dueDate", orderDirection: "asc" }
);

export function subscribeToPayables(
  status: FinanceStatus | "all",
  onChange: (payables: IPayable[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return payablesService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createPayable(
  input: PayableInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return payablesService.create(input, owner, {
    companyId: getCurrentCompanyId(),
    paidAt: null,
  });
}

export async function updatePayable(
  payableId: string,
  input: Partial<PayableInput>
): Promise<void> {
  return payablesService.update(payableId, input);
}

export async function markPayablePaid(payableId: string): Promise<void> {
  await updateDoc(doc(firestore, "payables", payableId), {
    status: "pago",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayable(payableId: string): Promise<void> {
  return payablesService.remove(payableId);
}

export async function getPayablesOpenTotal(): Promise<number> {
  const companyId = getCurrentCompanyId() ?? undefined;
  const [pendente, atrasado] = await Promise.all([
    payablesService.sumByStatus("value", "pendente", companyId),
    payablesService.sumByStatus("value", "atrasado", companyId),
  ]);
  return pendente + atrasado;
}

const receivablesService = createCrudService<IReceivable, ReceivableInput>(
  "receivables",
  mapReceivable,
  { orderByField: "dueDate", orderDirection: "asc" }
);

export function subscribeToReceivables(
  status: FinanceStatus | "all",
  onChange: (receivables: IReceivable[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return receivablesService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createReceivable(
  input: ReceivableInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return receivablesService.create(input, owner, {
    companyId: getCurrentCompanyId(),
    receivedAt: null,
  });
}

export async function updateReceivable(
  receivableId: string,
  input: Partial<ReceivableInput>
): Promise<void> {
  return receivablesService.update(receivableId, input);
}

export async function markReceivableReceived(
  receivableId: string
): Promise<void> {
  await updateDoc(doc(firestore, "receivables", receivableId), {
    status: "pago",
    receivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteReceivable(receivableId: string): Promise<void> {
  return receivablesService.remove(receivableId);
}

export async function getReceivablesOpenTotal(): Promise<number> {
  const companyId = getCurrentCompanyId() ?? undefined;
  const [pendente, atrasado] = await Promise.all([
    receivablesService.sumByStatus("value", "pendente", companyId),
    receivablesService.sumByStatus("value", "atrasado", companyId),
  ]);
  return pendente + atrasado;
}

export interface IMonthlyCashFlow {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface ICashFlowSummary {
  totalAPagar: number;
  totalAReceber: number;
  saldoPrevisto: number;
  months: IMonthlyCashFlow[];
}

const monthKey = (value: Timestamp | null): string => {
  if (!value) return "sem-data";
  const date = value.toDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export function getCashFlowSummary(
  payables: IPayable[],
  receivables: IReceivable[]
): ICashFlowSummary {
  const openPayables = payables.filter((p) => p.status !== "pago");
  const openReceivables = receivables.filter((r) => r.status !== "pago");

  const totalAPagar = openPayables.reduce((sum, p) => sum + p.value, 0);
  const totalAReceber = openReceivables.reduce((sum, r) => sum + r.value, 0);

  const monthMap = new Map<string, IMonthlyCashFlow>();

  const ensureMonth = (key: string): IMonthlyCashFlow => {
    if (!monthMap.has(key)) {
      monthMap.set(key, { month: key, receitas: 0, despesas: 0, saldo: 0 });
    }
    return monthMap.get(key)!;
  };

  payables.forEach((p) => {
    const entry = ensureMonth(monthKey(p.dueDate));
    entry.despesas += p.value;
  });

  receivables.forEach((r) => {
    const entry = ensureMonth(monthKey(r.dueDate));
    entry.receitas += r.value;
  });

  const months = Array.from(monthMap.values())
    .map((entry) => ({ ...entry, saldo: entry.receitas - entry.despesas }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalAPagar,
    totalAReceber,
    saldoPrevisto: totalAReceber - totalAPagar,
    months,
  };
}
