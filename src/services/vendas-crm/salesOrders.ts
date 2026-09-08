import {
  DocumentData,
  DocumentReference,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { firestore } from "../shared/firebase";
import { appendAuditLog } from "../shared/auditLog";
import { ISalesOrder, ISalesOrderItem, SalesOrderInput, SalesOrderStatus } from "../../types/salesOrder";

export const mapSalesOrder = (snap: QueryDocumentSnapshot<DocumentData>): ISalesOrder => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    contactId: data.contactId,
    contactName: data.contactName ?? "",
    proposalId: data.proposalId ?? "",
    dealId: data.dealId ?? "",
    warehouseId: data.warehouseId ?? "",
    warehouseName: data.warehouseName ?? "",
    items: data.items ?? [],
    total: data.total ?? 0,
    status: data.status,
    approvedProcessedAt: data.approvedProcessedAt ?? null,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const salesOrdersService = createCrudService<ISalesOrder, SalesOrderInput>(
  "salesOrders",
  mapSalesOrder
);

export function subscribeToSalesOrders(
  status: SalesOrderStatus | "all",
  onChange: (orders: ISalesOrder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return salesOrdersService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createSalesOrder(
  input: SalesOrderInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return salesOrdersService.create(input, owner, {
    companyId: getCurrentCompanyId(),
    approvedProcessedAt: null,
  });
}

export async function updateSalesOrder(
  orderId: string,
  input: Partial<SalesOrderInput>
): Promise<void> {
  return salesOrdersService.update(orderId, input);
}

export async function deleteSalesOrder(orderId: string): Promise<void> {
  return salesOrdersService.remove(orderId);
}

export async function approveSalesOrder(
  orderId: string,
  owner: { uid: string; name?: string | null }
): Promise<void> {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    throw new Error("Nenhuma empresa selecionada.");
  }

  const orderRef = doc(firestore, "salesOrders", orderId);

  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error("Pedido não encontrado.");
  }
  const order = orderSnap.data();

  if (order.approvedProcessedAt) {
    throw new Error("Esse pedido já foi aprovado.");
  }
  if (order.status === "cancelado") {
    throw new Error("Não é possível aprovar um pedido cancelado.");
  }

  const items: ISalesOrderItem[] = order.items ?? [];
  const quantityByProduct = new Map<string, number>();
  for (const item of items) {
    quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const findInventoryRef = async (
    productId: string
  ): Promise<DocumentReference<DocumentData> | null> => {
    const q = query(
      collection(firestore, "inventoryItems"),
      where("companyId", "==", companyId),
      where("productId", "==", productId)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].ref;
  };

  // Resolves how much stock each inventoryItem needs to be deducted by: either
  // directly (the sold product itself is tracked in stock) or through a recipe
  // (the sold product has no stock of its own, but consumes fractional amounts
  // of other products that are).
  const inventoryRefById = new Map<string, DocumentReference<DocumentData>>();
  const quantityByInventoryItem = new Map<string, number>();

  for (const [productId, quantity] of quantityByProduct) {
    const directRef = await findInventoryRef(productId);
    if (directRef) {
      inventoryRefById.set(directRef.id, directRef);
      quantityByInventoryItem.set(
        directRef.id,
        (quantityByInventoryItem.get(directRef.id) ?? 0) + quantity
      );
      continue;
    }

    const productSnap = await getDoc(doc(firestore, "products", productId));
    const recipe: { ingredientProductId: string; quantityPerUnit: number }[] = productSnap.exists()
      ? (productSnap.data().recipe ?? [])
      : [];

    for (const ingredient of recipe) {
      const ingredientRef = await findInventoryRef(ingredient.ingredientProductId);
      if (!ingredientRef) continue;

      const consumed = quantity * ingredient.quantityPerUnit;
      inventoryRefById.set(ingredientRef.id, ingredientRef);
      quantityByInventoryItem.set(
        ingredientRef.id,
        (quantityByInventoryItem.get(ingredientRef.id) ?? 0) + consumed
      );
    }
  }

  const receivableRef = doc(collection(firestore, "receivables"));

  await runTransaction(firestore, async (transaction) => {
    const freshOrderSnap = await transaction.get(orderRef);
    if (!freshOrderSnap.exists()) {
      throw new Error("Pedido não encontrado.");
    }
    const freshOrder = freshOrderSnap.data();
    if (freshOrder.approvedProcessedAt) {
      throw new Error("Esse pedido já foi aprovado.");
    }

    const inventoryData = new Map<
      string,
      { ref: DocumentReference<DocumentData>; quantity: number; name: string }
    >();
    for (const [itemId, ref] of inventoryRefById) {
      const snap = await transaction.get(ref);
      if (snap.exists()) {
        const data = snap.data();
        inventoryData.set(itemId, {
          ref,
          quantity: (data.quantity as number) ?? 0,
          name: data.name ?? "",
        });
      }
    }

    const warehouseStockData = new Map<
      string,
      { ref: DocumentReference<DocumentData>; quantity: number }
    >();
    if (order.warehouseId) {
      for (const [itemId, inv] of inventoryData) {
        const wsRef = doc(firestore, "warehouseStock", `${inv.ref.id}_${order.warehouseId}`);
        const wsSnap = await transaction.get(wsRef);
        warehouseStockData.set(itemId, {
          ref: wsRef,
          quantity: wsSnap.exists() ? ((wsSnap.data().quantity as number) ?? 0) : 0,
        });
      }
    }

    for (const [itemId, quantity] of quantityByInventoryItem) {
      const inv = inventoryData.get(itemId);
      if (!inv) continue;

      const newQuantity = inv.quantity - quantity;
      if (newQuantity < 0) {
        throw new Error(`Estoque insuficiente para "${inv.name}".`);
      }

      transaction.update(inv.ref, { quantity: newQuantity, updatedAt: serverTimestamp() });

      const movementRef = doc(collection(firestore, "stockMovements"));
      transaction.set(movementRef, {
        companyId,
        itemId: inv.ref.id,
        warehouseId: order.warehouseId ?? null,
        type: "saida",
        quantity: -quantity,
        balanceAfter: newQuantity,
        notes: `Saída do pedido de venda "${orderId}"`,
        ownerId: owner.uid,
        ownerName: owner.name ?? "",
        createdAt: serverTimestamp(),
      });

      if (order.warehouseId) {
        const ws = warehouseStockData.get(itemId)!;
        transaction.set(ws.ref, {
          companyId,
          itemId: inv.ref.id,
          itemName: inv.name,
          warehouseId: order.warehouseId,
          quantity: Math.max(0, ws.quantity - quantity),
          updatedAt: serverTimestamp(),
        });
      }
    }

    transaction.update(orderRef, {
      status: "aprovado",
      approvedProcessedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(receivableRef, {
      companyId,
      description: `Pedido de venda: ${order.contactName}`,
      contactId: order.contactId,
      contactName: order.contactName,
      category: "Vendas",
      value: order.total,
      dueDate: null,
      receivedAt: null,
      status: "pendente",
      notes: "Gerado automaticamente a partir de um pedido de venda aprovado.",
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    appendAuditLog(transaction, {
      companyId,
      entityType: "salesOrders",
      entityId: orderId,
      entitySummary: order.contactName ?? orderId,
      action: "update",
      changedFields: [{ field: "status", before: order.status, after: "aprovado" }],
      owner,
    });
  });
}
