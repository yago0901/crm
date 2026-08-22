import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getAggregateFromServer,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  sum,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase";
import {
  FinanceStatus,
  IPayable,
  IReceivable,
  PayableInput,
  ReceivableInput,
} from "../types/finance";

const payablesRef = collection(firestore, "payables");
const receivablesRef = collection(firestore, "receivables");

export const mapPayable = (snap: QueryDocumentSnapshot<DocumentData>): IPayable => {
  const data = snap.data();
  return {
    id: snap.id,
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

export function subscribeToPayables(
  status: FinanceStatus | "all",
  onChange: (payables: IPayable[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const constraints = [orderBy("dueDate", "asc")];
  const q =
    status === "all"
      ? query(payablesRef, ...constraints)
      : query(payablesRef, where("status", "==", status), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapPayable)),
    (error) => onError?.(error)
  );
}

export async function createPayable(
  input: PayableInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  const docRef = await addDoc(payablesRef, {
    ...input,
    paidAt: null,
    ownerId: owner.uid,
    ownerName: owner.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePayable(
  payableId: string,
  input: Partial<PayableInput>
): Promise<void> {
  await updateDoc(doc(firestore, "payables", payableId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function markPayablePaid(payableId: string): Promise<void> {
  await updateDoc(doc(firestore, "payables", payableId), {
    status: "pago",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayable(payableId: string): Promise<void> {
  await deleteDoc(doc(firestore, "payables", payableId));
}

export async function getPayablesOpenTotal(): Promise<number> {
  const [pendente, atrasado] = await Promise.all([
    getAggregateFromServer(query(payablesRef, where("status", "==", "pendente")), {
      total: sum("value"),
    }),
    getAggregateFromServer(query(payablesRef, where("status", "==", "atrasado")), {
      total: sum("value"),
    }),
  ]);
  return pendente.data().total + atrasado.data().total;
}

export function subscribeToReceivables(
  status: FinanceStatus | "all",
  onChange: (receivables: IReceivable[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const constraints = [orderBy("dueDate", "asc")];
  const q =
    status === "all"
      ? query(receivablesRef, ...constraints)
      : query(receivablesRef, where("status", "==", status), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapReceivable)),
    (error) => onError?.(error)
  );
}

export async function createReceivable(
  input: ReceivableInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  const docRef = await addDoc(receivablesRef, {
    ...input,
    receivedAt: null,
    ownerId: owner.uid,
    ownerName: owner.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateReceivable(
  receivableId: string,
  input: Partial<ReceivableInput>
): Promise<void> {
  await updateDoc(doc(firestore, "receivables", receivableId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
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
  await deleteDoc(doc(firestore, "receivables", receivableId));
}

export async function getReceivablesOpenTotal(): Promise<number> {
  const [pendente, atrasado] = await Promise.all([
    getAggregateFromServer(query(receivablesRef, where("status", "==", "pendente")), {
      total: sum("value"),
    }),
    getAggregateFromServer(query(receivablesRef, where("status", "==", "atrasado")), {
      total: sum("value"),
    }),
  ]);
  return pendente.data().total + atrasado.data().total;
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
