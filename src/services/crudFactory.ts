import {
  addDoc,
  collection,
  CollectionReference,
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
  const { orderByField = "createdAt", orderDirection = "desc" } = config;
  const ref: CollectionReference<DocumentData> = collection(firestore, collectionName);

  function subscribe(
    status: string | "all",
    onChange: (items: T[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const constraints = [orderBy(orderByField, orderDirection)];
    const q =
      status === "all"
        ? query(ref, ...constraints)
        : query(ref, where("status", "==", status), ...constraints);

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

  async function sumByStatus(field: string, status: string): Promise<number> {
    const snap = await getAggregateFromServer(query(ref, where("status", "==", status)), {
      total: sum(field),
    });
    return snap.data().total;
  }

  return { ref, subscribe, create, update, remove, sumByStatus };
}
