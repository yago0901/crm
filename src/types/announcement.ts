import { Timestamp } from "firebase/firestore";

export type AnnouncementStatus = "rascunho" | "publicado";

export interface IAnnouncement {
  id: string;
  companyId: string;
  title: string;
  body: string;
  audience: string;
  status: AnnouncementStatus;
  publishedAt: Timestamp | null;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type AnnouncementInput = Pick<
  IAnnouncement,
  "title" | "body" | "audience" | "status"
>;
