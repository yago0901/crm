import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import {
  IResourceAllocation,
  ResourceAllocationInput,
  ResourceAllocationStatus,
} from "../../types/resourceAllocation";

export const mapResourceAllocation = (
  snap: QueryDocumentSnapshot<DocumentData>
): IResourceAllocation => {
  const data = snap.data();
  return {
    id: snap.id,
    projectId: data.projectId,
    projectName: data.projectName ?? "",
    employeeId: data.employeeId,
    employeeName: data.employeeName ?? "",
    role: data.role ?? "",
    allocationPercent: data.allocationPercent ?? 0,
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

const resourceAllocationsService = createCrudService<
  IResourceAllocation,
  ResourceAllocationInput
>("resourceAllocations", mapResourceAllocation, {
  orderByField: "startDate",
  orderDirection: "asc",
});

export function subscribeToResourceAllocations(
  status: ResourceAllocationStatus | "all",
  onChange: (allocations: IResourceAllocation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return resourceAllocationsService.subscribe(status, onChange, onError);
}

export async function createResourceAllocation(
  input: ResourceAllocationInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return resourceAllocationsService.create(input, owner);
}

export async function updateResourceAllocation(
  allocationId: string,
  input: Partial<ResourceAllocationInput>
): Promise<void> {
  return resourceAllocationsService.update(allocationId, input);
}

export async function deleteResourceAllocation(allocationId: string): Promise<void> {
  return resourceAllocationsService.remove(allocationId);
}

export async function getActiveAllocationsCount(): Promise<number> {
  return resourceAllocationsService.countByStatus("ativa");
}
