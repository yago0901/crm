import {
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase";
import { getCurrentCompanyId } from "./tenant";
import { INotification, NotificationStatus } from "../../types/notification";

export const mapNotification = (
  snap: QueryDocumentSnapshot<DocumentData>
): INotification => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    type: data.type,
    status: data.status,
    title: data.title ?? "",
    message: data.message ?? "",
    relatedModule: data.relatedModule ?? "",
    relatedId: data.relatedId ?? "",
    relatedLabel: data.relatedLabel ?? "",
    triggerValue: data.triggerValue ?? 0,
    thresholdValue: data.thresholdValue ?? 0,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    resolvedAt: data.resolvedAt ?? null,
    ownerId: data.ownerId ?? "",
    ownerName: data.ownerName ?? "",
  };
};

export function subscribeToNotifications(
  status: NotificationStatus | "all",
  onChange: (items: INotification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    onChange([]);
    return () => {};
  }

  const constraints = [where("companyId", "==", companyId)];
  if (status !== "all") constraints.push(where("status", "==", status));

  const q = query(
    collection(firestore, "notifications"),
    ...constraints,
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(mapNotification)),
    (error) => onError?.(error)
  );
}

export function subscribeToOpenNotificationCount(
  onChange: (count: number) => void
): Unsubscribe {
  return subscribeToNotifications(
    "aberto",
    (items) => onChange(items.length),
    () => onChange(0)
  );
}
