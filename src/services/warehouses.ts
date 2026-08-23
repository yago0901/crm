import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { IWarehouse, WarehouseInput, WarehouseStatus } from "../types/warehouse";

export const mapWarehouse = (
  snap: QueryDocumentSnapshot<DocumentData>
): IWarehouse => {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    address: data.address ?? "",
    capacity: data.capacity ?? 0,
    manager: data.manager ?? "",
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const warehousesService = createCrudService<IWarehouse, WarehouseInput>(
  "warehouses",
  mapWarehouse
);

export function subscribeToWarehouses(
  status: WarehouseStatus | "all",
  onChange: (warehouses: IWarehouse[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return warehousesService.subscribe(status, onChange, onError);
}

export async function createWarehouse(
  input: WarehouseInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return warehousesService.create(input, owner);
}

export async function updateWarehouse(
  warehouseId: string,
  input: Partial<WarehouseInput>
): Promise<void> {
  return warehousesService.update(warehouseId, input);
}

export async function deleteWarehouse(warehouseId: string): Promise<void> {
  return warehousesService.remove(warehouseId);
}

export async function getActiveWarehousesCount(): Promise<number> {
  return warehousesService.countByStatus("ativo");
}
