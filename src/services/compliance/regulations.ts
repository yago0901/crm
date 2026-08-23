import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { IRegulation, RegulationInput, RegulationStatus } from "../../types/regulation";

export const mapRegulation = (
  snap: QueryDocumentSnapshot<DocumentData>
): IRegulation => {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    category: data.category ?? "",
    responsible: data.responsible ?? "",
    deadline: data.deadline ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const regulationsService = createCrudService<IRegulation, RegulationInput>(
  "regulations",
  mapRegulation,
  { orderByField: "deadline", orderDirection: "asc" }
);

export function subscribeToRegulations(
  status: RegulationStatus | "all",
  onChange: (regulations: IRegulation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return regulationsService.subscribe(status, onChange, onError);
}

export async function createRegulation(
  input: RegulationInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return regulationsService.create(input, owner);
}

export async function updateRegulation(
  regulationId: string,
  input: Partial<RegulationInput>
): Promise<void> {
  return regulationsService.update(regulationId, input);
}

export async function deleteRegulation(regulationId: string): Promise<void> {
  return regulationsService.remove(regulationId);
}

export async function getOverdueRegulationsCount(): Promise<number> {
  return regulationsService.countByStatus("vencido");
}
