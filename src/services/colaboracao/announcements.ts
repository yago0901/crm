import { doc, DocumentData, QueryDocumentSnapshot, serverTimestamp, Unsubscribe, updateDoc } from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { AnnouncementInput, AnnouncementStatus, IAnnouncement } from "../../types/announcement";

export const mapAnnouncement = (
  snap: QueryDocumentSnapshot<DocumentData>
): IAnnouncement => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    title: data.title,
    body: data.body ?? "",
    audience: data.audience ?? "",
    status: data.status,
    publishedAt: data.publishedAt ?? null,
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const announcementsService = createCrudService<IAnnouncement, AnnouncementInput>(
  "announcements",
  mapAnnouncement
);

export function subscribeToAnnouncements(
  status: AnnouncementStatus | "all",
  onChange: (announcements: IAnnouncement[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return announcementsService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createAnnouncement(
  input: AnnouncementInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return announcementsService.create(input, owner, {
    companyId: getCurrentCompanyId(),
    publishedAt: null,
  });
}

export async function updateAnnouncement(
  announcementId: string,
  input: Partial<AnnouncementInput>
): Promise<void> {
  return announcementsService.update(announcementId, input);
}

export async function publishAnnouncement(announcementId: string): Promise<void> {
  await updateDoc(doc(firestore, "announcements", announcementId), {
    status: "publicado",
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  return announcementsService.remove(announcementId);
}

export async function getDraftAnnouncementsCount(): Promise<number> {
  return announcementsService.countByStatus("rascunho", getCurrentCompanyId() ?? undefined);
}
