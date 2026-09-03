import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { IWarehouseStock } from "../../types/warehouseStock";

export const mapWarehouseStock = (
  snap: QueryDocumentSnapshot<DocumentData>
): IWarehouseStock => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    itemId: data.itemId,
    itemName: data.itemName ?? "",
    warehouseId: data.warehouseId,
    quantity: data.quantity ?? 0,
    updatedAt: data.updatedAt ?? null,
  };
};
