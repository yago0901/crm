import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { IQualityCheck, QualityCheckInput, QualityCheckStatus } from "../../types/qualityCheck";

export const mapQualityCheck = (
  snap: QueryDocumentSnapshot<DocumentData>
): IQualityCheck => {
  const data = snap.data();
  return {
    id: snap.id,
    item: data.item,
    category: data.category ?? "",
    inspector: data.inspector ?? "",
    inspectionDate: data.inspectionDate ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const qualityChecksService = createCrudService<IQualityCheck, QualityCheckInput>(
  "qualityChecks",
  mapQualityCheck,
  { orderByField: "inspectionDate", orderDirection: "desc" }
);

export function subscribeToQualityChecks(
  status: QualityCheckStatus | "all",
  onChange: (checks: IQualityCheck[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return qualityChecksService.subscribe(status, onChange, onError);
}

export async function createQualityCheck(
  input: QualityCheckInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return qualityChecksService.create(input, owner);
}

export async function updateQualityCheck(
  checkId: string,
  input: Partial<QualityCheckInput>
): Promise<void> {
  return qualityChecksService.update(checkId, input);
}

export async function deleteQualityCheck(checkId: string): Promise<void> {
  return qualityChecksService.remove(checkId);
}

export async function getFailedQualityChecksCount(): Promise<number> {
  return qualityChecksService.countByStatus("reprovado");
}
