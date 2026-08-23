import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { IShipment, ShipmentInput, ShipmentStatus } from "../types/shipment";

export const mapShipment = (
  snap: QueryDocumentSnapshot<DocumentData>
): IShipment => {
  const data = snap.data();
  return {
    id: snap.id,
    description: data.description,
    destination: data.destination ?? "",
    carrier: data.carrier ?? "",
    trackingCode: data.trackingCode ?? "",
    status: data.status,
    shipDate: data.shipDate ?? null,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const shipmentsService = createCrudService<IShipment, ShipmentInput>(
  "shipments",
  mapShipment,
  { orderByField: "shipDate", orderDirection: "asc" }
);

export function subscribeToShipments(
  status: ShipmentStatus | "all",
  onChange: (shipments: IShipment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return shipmentsService.subscribe(status, onChange, onError);
}

export async function createShipment(
  input: ShipmentInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return shipmentsService.create(input, owner);
}

export async function updateShipment(
  shipmentId: string,
  input: Partial<ShipmentInput>
): Promise<void> {
  return shipmentsService.update(shipmentId, input);
}

export async function deleteShipment(shipmentId: string): Promise<void> {
  return shipmentsService.remove(shipmentId);
}

export async function getInTransitShipmentsCount(): Promise<number> {
  return shipmentsService.countByStatus("em_transito");
}
