import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { getCurrentCompanyId } from "./tenant";
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
    recipe: data.recipe ?? [],
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
  return productService.create(input, owner);
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
  return productService.fetchActive();
}
