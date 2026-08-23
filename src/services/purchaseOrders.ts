import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { IPurchaseOrder, PurchaseOrderInput, PurchaseOrderStatus } from "../types/purchaseOrder";

export const mapPurchaseOrder = (
  snap: QueryDocumentSnapshot<DocumentData>
): IPurchaseOrder => {
  const data = snap.data();
  return {
    id: snap.id,
    supplierId: data.supplierId,
    supplierName: data.supplierName ?? "",
    description: data.description,
    value: data.value ?? 0,
    status: data.status,
    orderDate: data.orderDate ?? null,
    expectedDate: data.expectedDate ?? null,
    notes: data.notes ?? "",
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
  return purchaseOrdersService.subscribe(status, onChange, onError);
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return purchaseOrdersService.create(input, owner);
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
  return purchaseOrdersService.sumByStatus("value", "pendente");
}
