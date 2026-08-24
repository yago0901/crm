import {
  DocumentData,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  Unsubscribe,
  where,
} from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { ISupplier, SupplierInput, SupplierStatus } from "../../types/supplier";

export const mapSupplier = (
  snap: QueryDocumentSnapshot<DocumentData>
): ISupplier => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
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
  return suppliersService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createSupplier(
  input: SupplierInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return suppliersService.create(input, owner, { companyId: getCurrentCompanyId() });
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
  const companyId = getCurrentCompanyId();
  const constraints = [
    ...(companyId ? [where("companyId", "==", companyId)] : []),
    where("status", "==", "ativo"),
    orderBy("name", "asc"),
  ];
  const q = query(suppliersService.ref, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapSupplier);
}
