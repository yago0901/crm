import {
  collection,
  getAggregateFromServer,
  getDocs,
  query,
  sum,
  where,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { getCurrentCompanyId } from "../shared/tenant";
import { mapInventoryItem } from "../estoques-logistica/inventory";
import { InventoryItemStatus } from "../../types/inventoryItem";
import { ProductionOrderStatus } from "../../types/productionOrder";
import { ProjectStatus } from "../../types/project";
import { PurchaseOrderStatus } from "../../types/purchaseOrder";
import { IStatusCount } from "../shared/dashboard";

function companyConstraints(...extra: ReturnType<typeof where>[]) {
  const companyId = getCurrentCompanyId();
  return companyId ? [where("companyId", "==", companyId), ...extra] : extra;
}

export async function getInventoryStatusBreakdown(): Promise<IStatusCount[]> {
  const statuses: InventoryItemStatus[] = ["ativo", "descontinuado"];
  const ref = collection(firestore, "inventoryItems");

  const counts = await Promise.all(
    statuses.map(async (status) => {
      const snap = await getDocs(query(ref, ...companyConstraints(where("status", "==", status))));
      return snap.size;
    })
  );

  return statuses.map((status, i) => ({ status, count: counts[i] }));
}

export async function getLowStockItemsCount(): Promise<number> {
  const snap = await getDocs(
    query(collection(firestore, "inventoryItems"), ...companyConstraints(where("status", "==", "ativo")))
  );
  const items = snap.docs.map(mapInventoryItem);
  return items.filter((item) => item.quantity <= item.minQuantity).length;
}

export async function getProductionOrdersStatusBreakdown(): Promise<IStatusCount[]> {
  const statuses: ProductionOrderStatus[] = [
    "pendente",
    "em_producao",
    "concluida",
    "cancelada",
  ];
  const ref = collection(firestore, "productionOrders");

  const counts = await Promise.all(
    statuses.map(async (status) => {
      const snap = await getDocs(query(ref, ...companyConstraints(where("status", "==", status))));
      return snap.size;
    })
  );

  return statuses.map((status, i) => ({ status, count: counts[i] }));
}

export async function getProjectsStatusBreakdown(): Promise<IStatusCount[]> {
  const statuses: ProjectStatus[] = [
    "planejamento",
    "em_andamento",
    "concluido",
    "cancelado",
  ];
  const ref = collection(firestore, "projects");

  const counts = await Promise.all(
    statuses.map(async (status) => {
      const snap = await getDocs(query(ref, ...companyConstraints(where("status", "==", status))));
      return snap.size;
    })
  );

  return statuses.map((status, i) => ({ status, count: counts[i] }));
}

export interface IValueByStatus {
  status: string;
  total: number;
}

export async function getPurchaseOrdersValueByStatus(): Promise<IValueByStatus[]> {
  const statuses: PurchaseOrderStatus[] = ["pendente", "aprovado", "recebido", "cancelado"];
  const ref = collection(firestore, "purchaseOrders");

  const results = await Promise.all(
    statuses.map((status) =>
      getAggregateFromServer(query(ref, ...companyConstraints(where("status", "==", status))), {
        total: sum("value"),
      })
    )
  );

  return statuses.map((status, i) => ({ status, total: results[i].data().total }));
}
