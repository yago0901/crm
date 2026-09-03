import {
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { firestore } from "../shared/firebase";
import { IWarehouse, WarehouseInput, WarehouseStatus } from "../../types/warehouse";

export const mapWarehouse = (
  snap: QueryDocumentSnapshot<DocumentData>
): IWarehouse => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
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
  return warehousesService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createWarehouse(
  input: WarehouseInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return warehousesService.create(input, owner, { companyId: getCurrentCompanyId() });
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
  return warehousesService.countByStatus("ativo", getCurrentCompanyId() ?? undefined);
}

export async function fetchActiveWarehouses(): Promise<IWarehouse[]> {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];

  const q = query(
    collection(firestore, "warehouses"),
    where("companyId", "==", companyId),
    where("status", "==", "ativo"),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapWarehouse);
}
