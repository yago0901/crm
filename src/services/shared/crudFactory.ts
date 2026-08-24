import {
  addDoc,
  collection,
  CollectionReference,
  count,
  deleteDoc,
  doc,
  DocumentData,
  getAggregateFromServer,
  onSnapshot,
  orderBy,
  OrderByDirection,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  sum,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase";

interface CrudServiceConfig {
  orderByField?: string;
  orderDirection?: OrderByDirection;
  filterField?: string;
}

export interface Owner {
  uid: string;
  name?: string | null;
}

export function createCrudService<T, TInput extends object>(
  collectionName: string,
  mapDoc: (snap: QueryDocumentSnapshot<DocumentData>) => T,
  config: CrudServiceConfig = {}
) {
  const {
    orderByField = "createdAt",
    orderDirection = "desc",
    filterField = "status",
  } = config;
  const ref: CollectionReference<DocumentData> = collection(firestore, collectionName);

  function subscribe(
    filterValue: string | "all",
    onChange: (items: T[]) => void,
    onError?: (error: Error) => void,
    companyId?: string
  ): Unsubscribe {
    const whereConstraints = companyId ? [where("companyId", "==", companyId)] : [];
    if (filterValue !== "all") {
      whereConstraints.push(where(filterField, "==", filterValue));
    }
    const q = query(ref, ...whereConstraints, orderBy(orderByField, orderDirection));

    return onSnapshot(
      q,
      (snapshot) => onChange(snapshot.docs.map(mapDoc)),
      (error) => onError?.(error)
    );
  }

  async function create(
    input: TInput,
    owner: Owner,
    extra: Record<string, unknown> = {}
  ): Promise<string> {
    const docRef = await addDoc(ref, {
      ...input,
      ...extra,
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async function update(
    id: string,
    input: Partial<TInput>,
    extra: Record<string, unknown> = {}
  ): Promise<void> {
    await updateDoc(doc(firestore, collectionName, id), {
      ...input,
      ...extra,
      updatedAt: serverTimestamp(),
    });
  }

  async function remove(id: string): Promise<void> {
    await deleteDoc(doc(firestore, collectionName, id));
  }

  async function sumByStatus(
    field: string,
    filterValue: string,
    companyId?: string
  ): Promise<number> {
    const whereConstraints = [where(filterField, "==", filterValue)];
    if (companyId) whereConstraints.push(where("companyId", "==", companyId));
    const snap = await getAggregateFromServer(query(ref, ...whereConstraints), {
      total: sum(field),
    });
    return snap.data().total;
  }

  async function countByStatus(filterValue: string, companyId?: string): Promise<number> {
    const whereConstraints = [where(filterField, "==", filterValue)];
    if (companyId) whereConstraints.push(where("companyId", "==", companyId));
    const snap = await getAggregateFromServer(query(ref, ...whereConstraints), {
      total: count(),
    });
    return snap.data().total;
  }

  return { ref, subscribe, create, update, remove, sumByStatus, countByStatus };
}
