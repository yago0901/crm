import {
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { appendAuditLog } from "../shared/auditLog";
import { IPurchaseOrder, PurchaseOrderInput, PurchaseOrderStatus } from "../../types/purchaseOrder";

export const mapPurchaseOrder = (
  snap: QueryDocumentSnapshot<DocumentData>
): IPurchaseOrder => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    supplierId: data.supplierId,
    supplierName: data.supplierName ?? "",
    description: data.description,
    value: data.value ?? 0,
    status: data.status,
    orderDate: data.orderDate ?? null,
    expectedDate: data.expectedDate ?? null,
    notes: data.notes ?? "",
    inventoryItemId: data.inventoryItemId ?? "",
    inventoryItemName: data.inventoryItemName ?? "",
    quantity: data.quantity ?? 0,
    receivedProcessedAt: data.receivedProcessedAt ?? null,
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const purchaseOrdersService = createCrudService<IPurchaseOrder, PurchaseOrderInput>(
  "purchaseOrders",
  mapPurchaseOrder,
  { orderByField: "orderDate", orderDirection: "desc" }
);

export function subscribeToPurchaseOrders(
  status: PurchaseOrderStatus | "all",
  onChange: (orders: IPurchaseOrder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return purchaseOrdersService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return purchaseOrdersService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updatePurchaseOrder(
  orderId: string,
  input: Partial<PurchaseOrderInput>
): Promise<void> {
  return purchaseOrdersService.update(orderId, input);
}

export async function deletePurchaseOrder(orderId: string): Promise<void> {
  return purchaseOrdersService.remove(orderId);
}

export async function getPendingPurchaseOrdersTotal(): Promise<number> {
  return purchaseOrdersService.sumByStatus("value", "pendente", getCurrentCompanyId() ?? undefined);
}

export async function receivePurchaseOrder(
  orderId: string,
  owner: { uid: string; name?: string | null }
): Promise<void> {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    throw new Error("Nenhuma empresa selecionada.");
  }

  const orderRef = doc(firestore, "purchaseOrders", orderId);
  const payableRef = doc(collection(firestore, "payables"));
  const movementRef = doc(collection(firestore, "stockMovements"));

  await runTransaction(firestore, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error("Pedido não encontrado.");
    }
    const order = orderSnap.data();

    if (order.receivedProcessedAt) {
      throw new Error("Esse pedido já foi recebido.");
    }
    if (order.status === "cancelado") {
      throw new Error("Não é possível receber um pedido cancelado.");
    }

    const hasStockLink = Boolean(order.inventoryItemId) && Number(order.quantity) > 0;
    const itemRef = hasStockLink ? doc(firestore, "inventoryItems", order.inventoryItemId) : null;

    let newQuantity = 0;
    if (itemRef) {
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists()) {
        throw new Error("Item de estoque vinculado não foi encontrado.");
      }
      const currentQuantity = (itemSnap.data().quantity as number) ?? 0;
      newQuantity = currentQuantity + Math.abs(order.quantity);
    }

    transaction.update(orderRef, {
      status: "recebido",
      receivedProcessedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(payableRef, {
      companyId,
      description: `Pedido de compra: ${order.description}`,
      supplier: order.supplierName ?? "",
      category: "Compras",
      value: order.value,
      dueDate: order.expectedDate ?? null,
      paidAt: null,
      status: "pendente",
      notes: "Gerado automaticamente ao receber o pedido de compra.",
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (itemRef) {
      transaction.update(itemRef, {
        quantity: newQuantity,
        updatedAt: serverTimestamp(),
      });

      transaction.set(movementRef, {
        companyId,
        itemId: order.inventoryItemId,
        type: "entrada",
        quantity: Math.abs(order.quantity),
        balanceAfter: newQuantity,
        notes: `Recebimento do pedido de compra "${order.description}"`,
        ownerId: owner.uid,
        ownerName: owner.name ?? "",
        createdAt: serverTimestamp(),
      });
    }

    appendAuditLog(transaction, {
      companyId,
      entityType: "purchaseOrders",
      entityId: orderId,
      entitySummary: order.description ?? orderId,
      action: "update",
      changedFields: [{ field: "status", before: order.status, after: "recebido" }],
      owner,
    });
  });
}
