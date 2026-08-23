import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { IProductionOrder, ProductionOrderInput, ProductionOrderStatus } from "../types/productionOrder";

export const mapProductionOrder = (
  snap: QueryDocumentSnapshot<DocumentData>
): IProductionOrder => {
  const data = snap.data();
  return {
    id: snap.id,
    description: data.description,
    productName: data.productName ?? "",
    quantity: data.quantity ?? 0,
    status: data.status,
    dueDate: data.dueDate ?? null,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const productionOrdersService = createCrudService<IProductionOrder, ProductionOrderInput>(
  "productionOrders",
  mapProductionOrder,
  { orderByField: "dueDate", orderDirection: "asc" }
);

export function subscribeToProductionOrders(
  status: ProductionOrderStatus | "all",
  onChange: (orders: IProductionOrder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return productionOrdersService.subscribe(status, onChange, onError);
}

export async function createProductionOrder(
  input: ProductionOrderInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return productionOrdersService.create(input, owner);
}

export async function updateProductionOrder(
  orderId: string,
  input: Partial<ProductionOrderInput>
): Promise<void> {
  return productionOrdersService.update(orderId, input);
}

export async function deleteProductionOrder(orderId: string): Promise<void> {
  return productionOrdersService.remove(orderId);
}

export async function getPendingProductionOrdersCount(): Promise<number> {
  return productionOrdersService.countByStatus("pendente");
}
