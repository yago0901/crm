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
import {
  FinanceStatus,
  IInstallmentPlan,
  IPayable,
  IReceivable,
  PayableInput,
  ReceivableInput,
} from "../../types/finance";

const OPEN_STATUSES: FinanceStatus[] = ["pendente", "atrasado", "parcialmente_pago", "renegociado"];
const CLOSED_STATUSES: FinanceStatus[] = ["pago", "cancelado", "estornado"];

export const mapPayable = (snap: QueryDocumentSnapshot<DocumentData>): IPayable => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    description: data.description,
    supplier: data.supplier ?? "",
    category: data.category ?? "",
    value: data.value ?? 0,
    paidValue: data.paidValue ?? 0,
    dueDate: data.dueDate ?? null,
    competenceDate: data.competenceDate ?? null,
    paidAt: data.paidAt ?? null,
    status: data.status,
    paymentMethod: data.paymentMethod ?? "",
    bankAccount: data.bankAccount ?? "",
    installmentGroupId: data.installmentGroupId ?? undefined,
    installmentNumber: data.installmentNumber ?? undefined,
    installmentTotal: data.installmentTotal ?? undefined,
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
    paidValue: data.paidValue ?? 0,
    dueDate: data.dueDate ?? null,
    competenceDate: data.competenceDate ?? null,
    receivedAt: data.receivedAt ?? null,
    status: data.status,
    paymentMethod: data.paymentMethod ?? "",
    bankAccount: data.bankAccount ?? "",
    installmentGroupId: data.installmentGroupId ?? undefined,
    installmentNumber: data.installmentNumber ?? undefined,
    installmentTotal: data.installmentTotal ?? undefined,
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
    paidAt: input.paidAt ?? null,
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
  const totals = await Promise.all(
    OPEN_STATUSES.map((status) => payablesService.sumByStatus("value", status, companyId))
  );
  return totals.reduce((sum, value) => sum + value, 0);
}

export async function createPayableInstallments(
  input: PayableInput,
  owner: { uid: string; name?: string | null },
  plan: IInstallmentPlan
): Promise<void> {
  const companyId = getCurrentCompanyId();
  if (!companyId) throw new Error("Nenhuma empresa selecionada.");
  if (!input.dueDate) throw new Error("Informe o vencimento da primeira parcela.");

  const batch = writeBatch(firestore);
  const installmentGroupId = doc(collection(firestore, "payables")).id;
  const perInstallment = Math.round((input.value / plan.count) * 100) / 100;
  const lastAdjustment = Math.round((input.value - perInstallment * (plan.count - 1)) * 100) / 100;
  const firstDueDate = input.dueDate.toDate();

  for (let i = 0; i < plan.count; i += 1) {
    const ref = doc(collection(firestore, "payables"));
    const dueDate = new Date(firstDueDate);
    dueDate.setDate(dueDate.getDate() + i * plan.intervalDays);
    const value = i === plan.count - 1 ? lastAdjustment : perInstallment;

    batch.set(ref, {
      ...input,
      value,
      paidValue: 0,
      dueDate: Timestamp.fromDate(dueDate),
      paidAt: null,
      companyId,
      installmentGroupId,
      installmentNumber: i + 1,
      installmentTotal: plan.count,
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
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
    receivedAt: input.receivedAt ?? null,
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
  const totals = await Promise.all(
    OPEN_STATUSES.map((status) => receivablesService.sumByStatus("value", status, companyId))
  );
  return totals.reduce((sum, value) => sum + value, 0);
}

export async function createReceivableInstallments(
  input: ReceivableInput,
  owner: { uid: string; name?: string | null },
  plan: IInstallmentPlan
): Promise<void> {
  const companyId = getCurrentCompanyId();
  if (!companyId) throw new Error("Nenhuma empresa selecionada.");
  if (!input.dueDate) throw new Error("Informe o vencimento da primeira parcela.");

  const batch = writeBatch(firestore);
  const installmentGroupId = doc(collection(firestore, "receivables")).id;
  const perInstallment = Math.round((input.value / plan.count) * 100) / 100;
  const lastAdjustment = Math.round((input.value - perInstallment * (plan.count - 1)) * 100) / 100;
  const firstDueDate = input.dueDate.toDate();

  for (let i = 0; i < plan.count; i += 1) {
    const ref = doc(collection(firestore, "receivables"));
    const dueDate = new Date(firstDueDate);
    dueDate.setDate(dueDate.getDate() + i * plan.intervalDays);
    const value = i === plan.count - 1 ? lastAdjustment : perInstallment;

    batch.set(ref, {
      ...input,
      value,
      paidValue: 0,
      dueDate: Timestamp.fromDate(dueDate),
      receivedAt: null,
      companyId,
      installmentGroupId,
      installmentNumber: i + 1,
      installmentTotal: plan.count,
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
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
  const isOpen = (status: FinanceStatus) => !CLOSED_STATUSES.includes(status);
  const openPayables = payables.filter((p) => isOpen(p.status));
  const openReceivables = receivables.filter((r) => isOpen(r.status));

  const totalAPagar = openPayables.reduce((sum, p) => sum + p.value, 0);
  const totalAReceber = openReceivables.reduce((sum, r) => sum + r.value, 0);

  const monthMap = new Map<string, IMonthlyCashFlow>();

  const ensureMonth = (key: string): IMonthlyCashFlow => {
    if (!monthMap.has(key)) {
      monthMap.set(key, { month: key, receitas: 0, despesas: 0, saldo: 0 });
    }
    return monthMap.get(key)!;
  };

  payables
    .filter((p) => p.status !== "cancelado" && p.status !== "estornado")
    .forEach((p) => {
      const entry = ensureMonth(monthKey(p.dueDate));
      entry.despesas += p.value;
    });

  receivables
    .filter((r) => r.status !== "cancelado" && r.status !== "estornado")
    .forEach((r) => {
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
