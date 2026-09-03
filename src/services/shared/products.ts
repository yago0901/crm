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
import { createCrudService } from "./crudFactory";
import { getCurrentCompanyId } from "./tenant";
import { firestore } from "./firebase";
import { IProduct, ProductInput, ProductStatus } from "../../types/product";

export const mapProduct = (snap: QueryDocumentSnapshot<DocumentData>): IProduct => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    name: data.name,
    sku: data.sku ?? "",
    category: data.category ?? "",
    unit: data.unit ?? "un",
    salePrice: data.salePrice ?? 0,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const productService = createCrudService<IProduct, ProductInput>("products", mapProduct);

export function subscribeToProducts(
  status: ProductStatus | "all",
  onChange: (products: IProduct[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return productService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createProduct(
  input: ProductInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return productService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductInput>
): Promise<void> {
  return productService.update(productId, input);
}

export async function deleteProduct(productId: string): Promise<void> {
  return productService.remove(productId);
}

export async function fetchActiveProducts(): Promise<IProduct[]> {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];

  const q = query(
    collection(firestore, "products"),
    where("companyId", "==", companyId),
    where("status", "==", "ativo"),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapProduct);
}
