import { Timestamp } from "firebase/firestore";

export type ProductStatus = "ativo" | "descontinuado";

export interface IRecipeItem {
  ingredientProductId: string;
  ingredientProductName: string;
  quantityPerUnit: number;
}

export interface IProduct {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  salePrice: number;
  recipe?: IRecipeItem[];
  status: ProductStatus;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ProductInput = Pick<
  IProduct,
  "name" | "sku" | "category" | "unit" | "salePrice" | "recipe" | "status" | "notes"
>;
