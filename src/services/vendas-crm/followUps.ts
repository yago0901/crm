import {
  doc,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { FollowUpInput, FollowUpStatus, IFollowUp } from "../../types/followUp";

export const mapFollowUp = (
  snap: QueryDocumentSnapshot<DocumentData>
): IFollowUp => {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    description: data.description ?? "",
    contactId: data.contactId ?? "",
    contactName: data.contactName ?? "",
    dueDate: data.dueDate ?? null,
    status: data.status,
    completedAt: data.completedAt ?? null,
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const followUpsService = createCrudService<IFollowUp, FollowUpInput>(
  "followUps",
  mapFollowUp,
  { orderByField: "dueDate", orderDirection: "asc" }
);

export function subscribeToFollowUps(
  status: FollowUpStatus | "all",
  onChange: (followUps: IFollowUp[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return followUpsService.subscribe(status, onChange, onError);
}

export async function createFollowUp(
  input: FollowUpInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return followUpsService.create(input, owner, { completedAt: null });
}

export async function updateFollowUp(
  followUpId: string,
  input: Partial<FollowUpInput>
): Promise<void> {
  return followUpsService.update(followUpId, input);
}

export async function markFollowUpDone(followUpId: string): Promise<void> {
  await updateDoc(doc(firestore, "followUps", followUpId), {
    status: "concluido",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFollowUp(followUpId: string): Promise<void> {
  return followUpsService.remove(followUpId);
}

export async function getPendingFollowUpsCount(): Promise<number> {
  return followUpsService.countByStatus("pendente");
}
