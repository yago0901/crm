import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { IProductionPlan, ProductionPlanInput, ProductionPlanStatus } from "../../types/productionPlan";

export const mapProductionPlan = (
  snap: QueryDocumentSnapshot<DocumentData>
): IProductionPlan => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    productName: data.productName,
    targetQuantity: data.targetQuantity ?? 0,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const productionPlansService = createCrudService<IProductionPlan, ProductionPlanInput>(
  "productionPlans",
  mapProductionPlan,
  { orderByField: "startDate", orderDirection: "asc" }
);

export function subscribeToProductionPlans(
  status: ProductionPlanStatus | "all",
  onChange: (plans: IProductionPlan[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return productionPlansService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createProductionPlan(
  input: ProductionPlanInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return productionPlansService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updateProductionPlan(
  planId: string,
  input: Partial<ProductionPlanInput>
): Promise<void> {
  return productionPlansService.update(planId, input);
}

export async function deleteProductionPlan(planId: string): Promise<void> {
  return productionPlansService.remove(planId);
}

export async function getActiveProductionPlansCount(): Promise<number> {
  return productionPlansService.countByStatus("em_andamento", getCurrentCompanyId() ?? undefined);
}
