import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { ComplianceItemInput, ComplianceStatus, IComplianceItem } from "../../types/complianceItem";

export const mapComplianceItem = (
  snap: QueryDocumentSnapshot<DocumentData>
): IComplianceItem => {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    category: data.category ?? "",
    responsible: data.responsible ?? "",
    reviewDate: data.reviewDate ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const complianceItemsService = createCrudService<IComplianceItem, ComplianceItemInput>(
  "complianceItems",
  mapComplianceItem,
  { orderByField: "reviewDate", orderDirection: "asc" }
);

export function subscribeToComplianceItems(
  status: ComplianceStatus | "all",
  onChange: (items: IComplianceItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return complianceItemsService.subscribe(status, onChange, onError);
}

export async function createComplianceItem(
  input: ComplianceItemInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return complianceItemsService.create(input, owner);
}

export async function updateComplianceItem(
  itemId: string,
  input: Partial<ComplianceItemInput>
): Promise<void> {
  return complianceItemsService.update(itemId, input);
}

export async function deleteComplianceItem(itemId: string): Promise<void> {
  return complianceItemsService.remove(itemId);
}

export async function getNonConformitiesCount(): Promise<number> {
  return complianceItemsService.countByStatus("nao_conforme");
}
