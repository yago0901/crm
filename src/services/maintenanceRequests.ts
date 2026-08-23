import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { IMaintenanceRequest, MaintenanceRequestInput, MaintenanceRequestStatus } from "../types/maintenanceRequest";

export const mapMaintenanceRequest = (
  snap: QueryDocumentSnapshot<DocumentData>
): IMaintenanceRequest => {
  const data = snap.data();
  return {
    id: snap.id,
    equipmentName: data.equipmentName,
    description: data.description ?? "",
    technician: data.technician ?? "",
    scheduledDate: data.scheduledDate ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const maintenanceRequestsService = createCrudService<IMaintenanceRequest, MaintenanceRequestInput>(
  "maintenanceRequests",
  mapMaintenanceRequest,
  { orderByField: "scheduledDate", orderDirection: "asc" }
);

export function subscribeToMaintenanceRequests(
  status: MaintenanceRequestStatus | "all",
  onChange: (requests: IMaintenanceRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return maintenanceRequestsService.subscribe(status, onChange, onError);
}

export async function createMaintenanceRequest(
  input: MaintenanceRequestInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return maintenanceRequestsService.create(input, owner);
}

export async function updateMaintenanceRequest(
  requestId: string,
  input: Partial<MaintenanceRequestInput>
): Promise<void> {
  return maintenanceRequestsService.update(requestId, input);
}

export async function deleteMaintenanceRequest(requestId: string): Promise<void> {
  return maintenanceRequestsService.remove(requestId);
}

export async function getScheduledMaintenanceCount(): Promise<number> {
  return maintenanceRequestsService.countByStatus("agendada");
}
