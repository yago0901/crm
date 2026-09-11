import { Timestamp } from "firebase/firestore";

export type NotificationType = "estoque_baixo";

export type NotificationStatus = "aberto" | "resolvido";

export interface INotification {
  id: string;
  companyId: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  relatedModule: string;
  relatedId: string;
  relatedLabel: string;
  triggerValue: number;
  thresholdValue: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  resolvedAt: Timestamp | null;
  ownerId: string;
  ownerName?: string;
}
