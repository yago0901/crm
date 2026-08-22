import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getAggregateFromServer,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  sum,
  Unsubscribe,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase";
import { ContractInput, ContractStatus, IContract } from "../types/contract";

const contractsRef = collection(firestore, "contracts");

export const mapContract = (
  snap: QueryDocumentSnapshot<DocumentData>
): IContract => {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    contactId: data.contactId,
    contactName: data.contactName,
    value: data.value ?? 0,
    status: data.status,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

export function subscribeToContracts(
  status: ContractStatus | "all",
  onChange: (contracts: IContract[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const constraints = [orderBy("createdAt", "desc")];
  const q =
    status === "all"
      ? query(contractsRef, ...constraints)
      : query(contractsRef, where("status", "==", status), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapContract)),
    (error) => onError?.(error)
  );
}

export async function createContract(
  input: ContractInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  const docRef = await addDoc(contractsRef, {
    ...input,
    ownerId: owner.uid,
    ownerName: owner.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateContract(
  contractId: string,
  input: Partial<ContractInput>
): Promise<void> {
  await updateDoc(doc(firestore, "contracts", contractId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContract(contractId: string): Promise<void> {
  await deleteDoc(doc(firestore, "contracts", contractId));
}

export async function getActiveContractsTotal(): Promise<number> {
  const snap = await getAggregateFromServer(
    query(contractsRef, where("status", "==", "ativo")),
    { total: sum("value") }
  );
  return snap.data().total;
}
