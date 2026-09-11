import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, firestore } from "../shared/firebase";
import { getCurrentCompanyId } from "../shared/tenant";
import { NotificationStatus } from "../../types/notification";

const LOW_STOCK_PREFIX = "estoque_baixo__";

export function lowStockNotificationId(itemId: string): string {
  return `${LOW_STOCK_PREFIX}${itemId}`;
}

export function lowStockNotificationRef(itemId: string): DocumentReference<DocumentData> {
  return doc(firestore, "notifications", lowStockNotificationId(itemId));
}

export type LowStockAction = "open" | "update" | "resolve" | "noop";

export function decideLowStockAction(params: {
  notifExists: boolean;
  notifStatus: NotificationStatus | null;
  quantity: number;
  minQuantity: number;
}): LowStockAction {
  const isOpen = params.notifExists && params.notifStatus === "aberto";
  const belowMin = params.minQuantity > 0 && params.quantity <= params.minQuantity;

  if (belowMin) return isOpen ? "update" : "open";
  return isOpen ? "resolve" : "noop";
}

interface LowStockWriter {
  set(ref: DocumentReference<DocumentData>, data: DocumentData): unknown;
  update(ref: DocumentReference<DocumentData>, data: DocumentData): unknown;
}

interface LowStockParams {
  companyId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  minQuantity: number;
  owner: { uid: string; name?: string | null };
}

const buildMessage = (quantity: number, minQuantity: number) =>
  `Quantidade ${quantity} no ou abaixo do mínimo ${minQuantity}.`;

export function applyLowStockNotification(
  writer: LowStockWriter,
  ref: DocumentReference<DocumentData>,
  notifSnap: DocumentSnapshot<DocumentData>,
  params: LowStockParams
): LowStockAction {
  const action = decideLowStockAction({
    notifExists: notifSnap.exists(),
    notifStatus: notifSnap.exists()
      ? (notifSnap.data()?.status as NotificationStatus)
      : null,
    quantity: params.quantity,
    minQuantity: params.minQuantity,
  });

  if (action === "open") {
    writer.set(ref, {
      companyId: params.companyId,
      type: "estoque_baixo",
      status: "aberto",
      title: `Estoque baixo: ${params.itemName}`,
      message: buildMessage(params.quantity, params.minQuantity),
      relatedModule: "Estoques e Logística",
      relatedId: params.itemId,
      relatedLabel: params.itemName,
      triggerValue: params.quantity,
      thresholdValue: params.minQuantity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      resolvedAt: null,
      ownerId: params.owner.uid,
      ownerName: params.owner.name ?? "",
    });
  } else if (action === "update") {
    writer.update(ref, {
      message: buildMessage(params.quantity, params.minQuantity),
      triggerValue: params.quantity,
      thresholdValue: params.minQuantity,
      updatedAt: serverTimestamp(),
    });
  } else if (action === "resolve") {
    writer.update(ref, {
      status: "resolvido",
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return action;
}

export async function syncLowStockNotificationForItem(itemId: string): Promise<void> {
  const companyId = getCurrentCompanyId();
  if (!companyId) return;

  const itemRef = doc(firestore, "inventoryItems", itemId);
  const notifRef = lowStockNotificationRef(itemId);
  const [itemSnap, notifSnap] = await Promise.all([getDoc(itemRef), getDoc(notifRef)]);

  const itemData = itemSnap.exists() ? itemSnap.data() : null;
  const quantity = itemData ? ((itemData.quantity as number) ?? 0) : Number.POSITIVE_INFINITY;
  const minQuantity = itemData ? ((itemData.minQuantity as number) ?? 0) : 0;
  const itemName = itemData
    ? (itemData.name ?? "")
    : (notifSnap.exists() ? (notifSnap.data()?.relatedLabel ?? "") : "");

  const action = decideLowStockAction({
    notifExists: notifSnap.exists(),
    notifStatus: notifSnap.exists()
      ? (notifSnap.data()?.status as NotificationStatus)
      : null,
    quantity,
    minQuantity,
  });

  if (action === "noop") return;

  const currentUser = auth.currentUser;

  if (action === "open") {
    await setDoc(notifRef, {
      companyId,
      type: "estoque_baixo",
      status: "aberto",
      title: `Estoque baixo: ${itemName}`,
      message: buildMessage(quantity, minQuantity),
      relatedModule: "Estoques e Logística",
      relatedId: itemId,
      relatedLabel: itemName,
      triggerValue: quantity,
      thresholdValue: minQuantity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      resolvedAt: null,
      ownerId: currentUser?.uid ?? "system",
      ownerName: currentUser?.displayName ?? currentUser?.email ?? "",
    });
  } else if (action === "update") {
    await updateDoc(notifRef, {
      message: buildMessage(quantity, minQuantity),
      triggerValue: quantity,
      thresholdValue: minQuantity,
      updatedAt: serverTimestamp(),
    });
  } else if (action === "resolve") {
    await updateDoc(notifRef, {
      status: "resolvido",
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
