import {
  addDoc,
  collection,
  CollectionReference,
  count,
  doc,
  DocumentData,
  getAggregateFromServer,
  getDoc,
  onSnapshot,
  orderBy,
  OrderByDirection,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  sum,
  Unsubscribe,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "./firebase";
import { appendAuditLog, computeChangedFields, summarizeEntity } from "./auditLog";

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
    const docRef = doc(firestore, collectionName, id);
    const before = await getDoc(docRef);
    const beforeData = before.data() ?? {};

    const batch = writeBatch(firestore);
    batch.update(docRef, {
      ...input,
      ...extra,
      updatedAt: serverTimestamp(),
    });

    const changedFields = computeChangedFields(beforeData, { ...input, ...extra });
    if (changedFields.length > 0 && auth.currentUser && beforeData.companyId) {
      appendAuditLog(batch, {
        companyId: beforeData.companyId,
        entityType: collectionName,
        entityId: id,
        entitySummary: summarizeEntity(beforeData, id),
        action: "update",
        changedFields,
        owner: { uid: auth.currentUser.uid, name: auth.currentUser.displayName ?? auth.currentUser.email },
      });
    }

    await batch.commit();
  }

  async function remove(id: string): Promise<void> {
    const docRef = doc(firestore, collectionName, id);
    const before = await getDoc(docRef);
    const beforeData = before.data();

    const batch = writeBatch(firestore);
    batch.delete(docRef);

    if (beforeData && auth.currentUser && beforeData.companyId) {
      appendAuditLog(batch, {
        companyId: beforeData.companyId,
        entityType: collectionName,
        entityId: id,
        entitySummary: summarizeEntity(beforeData, id),
        action: "delete",
        changedFields: [],
        owner: { uid: auth.currentUser.uid, name: auth.currentUser.displayName ?? auth.currentUser.email },
      });
    }

    await batch.commit();
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
