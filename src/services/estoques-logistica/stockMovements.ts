import {
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { getCurrentCompanyId } from "../shared/tenant";
import { IStockMovement, StockMovementType } from "../../types/stockMovement";

const INCREASING_TYPES: StockMovementType[] = ["entrada", "devolucao"];

export const mapStockMovement = (
  snap: QueryDocumentSnapshot<DocumentData>
): IStockMovement => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    itemId: data.itemId,
    warehouseId: data.warehouseId ?? "",
    type: data.type,
    quantity: data.quantity,
    balanceAfter: data.balanceAfter,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
  };
};

export function computeMovementDelta(
  type: StockMovementType,
  value: number,
  currentQuantity: number
): number {
  if (type === "inventario") return value - currentQuantity;
  if (type === "ajuste") return value;
  if (INCREASING_TYPES.includes(type)) return Math.abs(value);
  return -Math.abs(value);
}

export interface ICreateStockMovementInput {
  itemId: string;
  type: StockMovementType;
  value: number;
  notes?: string;
  warehouseId?: string;
}

export async function createStockMovement(
  input: ICreateStockMovementInput,
  owner: { uid: string; name?: string | null }
): Promise<void> {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    throw new Error("Nenhuma empresa selecionada.");
  }

  const itemRef = doc(firestore, "inventoryItems", input.itemId);
  const movementRef = doc(collection(firestore, "stockMovements"));
  const warehouseStockRef = input.warehouseId
    ? doc(firestore, "warehouseStock", `${input.itemId}_${input.warehouseId}`)
    : null;

  await runTransaction(firestore, async (transaction) => {
    const itemSnap = await transaction.get(itemRef);
    if (!itemSnap.exists()) {
      throw new Error("Item não encontrado.");
    }
    const warehouseStockSnap = warehouseStockRef
      ? await transaction.get(warehouseStockRef)
      : null;

    const itemData = itemSnap.data();
    const currentQuantity = (itemData.quantity as number) ?? 0;
    const delta = computeMovementDelta(input.type, input.value, currentQuantity);
    const newQuantity = currentQuantity + delta;

    if (newQuantity < 0) {
      throw new Error("Essa movimentação deixaria o estoque negativo.");
    }

    transaction.update(itemRef, {
      quantity: newQuantity,
      updatedAt: serverTimestamp(),
    });

    transaction.set(movementRef, {
      companyId,
      itemId: input.itemId,
      warehouseId: input.warehouseId ?? null,
      type: input.type,
      quantity: delta,
      balanceAfter: newQuantity,
      notes: input.notes ?? "",
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
    });

    if (warehouseStockRef && input.warehouseId) {
      const currentWarehouseQuantity = warehouseStockSnap?.exists()
        ? ((warehouseStockSnap.data().quantity as number) ?? 0)
        : 0;
      const newWarehouseQuantity = Math.max(0, currentWarehouseQuantity + delta);

      transaction.set(warehouseStockRef, {
        companyId,
        itemId: input.itemId,
        itemName: itemData.name ?? "",
        warehouseId: input.warehouseId,
        quantity: newWarehouseQuantity,
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function fetchMovementsForItem(itemId: string): Promise<IStockMovement[]> {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];

  const q = query(
    collection(firestore, "stockMovements"),
    where("companyId", "==", companyId),
    where("itemId", "==", itemId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapStockMovement);
}
