import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import {
  DepartmentInitiativeInput,
  DepartmentInitiativeStatus,
  IDepartmentInitiative,
} from "../../types/departmentInitiative";

export const mapDepartmentInitiative = (
  snap: QueryDocumentSnapshot<DocumentData>
): IDepartmentInitiative => {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    departments: data.departments ?? "",
    description: data.description ?? "",
    leadName: data.leadName ?? "",
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const departmentInitiativesService = createCrudService<
  IDepartmentInitiative,
  DepartmentInitiativeInput
>("departmentInitiatives", mapDepartmentInitiative);

export function subscribeToDepartmentInitiatives(
  status: DepartmentInitiativeStatus | "all",
  onChange: (initiatives: IDepartmentInitiative[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return departmentInitiativesService.subscribe(status, onChange, onError);
}

export async function createDepartmentInitiative(
  input: DepartmentInitiativeInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return departmentInitiativesService.create(input, owner);
}

export async function updateDepartmentInitiative(
  initiativeId: string,
  input: Partial<DepartmentInitiativeInput>
): Promise<void> {
  return departmentInitiativesService.update(initiativeId, input);
}

export async function deleteDepartmentInitiative(initiativeId: string): Promise<void> {
  return departmentInitiativesService.remove(initiativeId);
}

export async function getActiveInitiativesCount(): Promise<number> {
  return departmentInitiativesService.countByStatus("em_andamento");
}
