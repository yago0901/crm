import {
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { firestore } from "../shared/firebase";
import { IInventoryItem, InventoryItemInput, InventoryItemStatus } from "../../types/inventoryItem";

export const mapInventoryItem = (
  snap: QueryDocumentSnapshot<DocumentData>
): IInventoryItem => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    productId: data.productId,
    name: data.name,
    sku: data.sku ?? "",
    category: data.category ?? "",
    quantity: data.quantity ?? 0,
    minQuantity: data.minQuantity ?? 0,
    unit: data.unit ?? "un",
    unitCost: data.unitCost ?? 0,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const inventoryService = createCrudService<IInventoryItem, InventoryItemInput>(
  "inventoryItems",
  mapInventoryItem
);

export function subscribeToInventoryItems(
  status: InventoryItemStatus | "all",
  onChange: (items: IInventoryItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return inventoryService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createInventoryItem(
  input: InventoryItemInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  const companyId = getCurrentCompanyId();
  const itemRef = doc(collection(firestore, "inventoryItems"));

  const batch = writeBatch(firestore);
  batch.set(itemRef, {
    ...input,
    companyId,
    ownerId: owner.uid,
    ownerName: owner.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.quantity > 0) {
    const movementRef = doc(collection(firestore, "stockMovements"));
    batch.set(movementRef, {
      companyId,
      itemId: itemRef.id,
      type: "entrada",
      quantity: input.quantity,
      balanceAfter: input.quantity,
      notes: "Quantidade inicial do cadastro",
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return itemRef.id;
}

export async function updateInventoryItem(
  itemId: string,
  input: Partial<InventoryItemInput>
): Promise<void> {
  return inventoryService.update(itemId, input);
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  return inventoryService.remove(itemId);
}

export async function getActiveInventoryTotal(): Promise<number> {
  return inventoryService.countByStatus("ativo", getCurrentCompanyId() ?? undefined);
}

export async function fetchActiveInventoryItems(): Promise<IInventoryItem[]> {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];

  const q = query(
    collection(firestore, "inventoryItems"),
    where("companyId", "==", companyId),
    where("status", "==", "ativo"),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapInventoryItem);
}
