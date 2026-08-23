import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { IInventoryItem, InventoryItemInput, InventoryItemStatus } from "../types/inventoryItem";

export const mapInventoryItem = (
  snap: QueryDocumentSnapshot<DocumentData>
): IInventoryItem => {
  const data = snap.data();
  return {
    id: snap.id,
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
  return inventoryService.subscribe(status, onChange, onError);
}

export async function createInventoryItem(
  input: InventoryItemInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return inventoryService.create(input, owner);
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
  return inventoryService.countByStatus("ativo");
}
