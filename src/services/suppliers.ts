import {
  DocumentData,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  Unsubscribe,
  where,
} from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { ISupplier, SupplierInput, SupplierStatus } from "../types/supplier";

export const mapSupplier = (
  snap: QueryDocumentSnapshot<DocumentData>
): ISupplier => {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    contactName: data.contactName ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    category: data.category ?? "",
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const suppliersService = createCrudService<ISupplier, SupplierInput>(
  "suppliers",
  mapSupplier
);

export function subscribeToSuppliers(
  status: SupplierStatus | "all",
  onChange: (suppliers: ISupplier[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return suppliersService.subscribe(status, onChange, onError);
}

export async function createSupplier(
  input: SupplierInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return suppliersService.create(input, owner);
}

export async function updateSupplier(
  supplierId: string,
  input: Partial<SupplierInput>
): Promise<void> {
  return suppliersService.update(supplierId, input);
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  return suppliersService.remove(supplierId);
}

export async function fetchActiveSuppliers(): Promise<ISupplier[]> {
  const q = query(
    suppliersService.ref,
    where("status", "==", "ativo"),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapSupplier);
}
