import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { CandidateInput, CandidateStatus, ICandidate } from "../types/candidate";

export const mapCandidate = (
  snap: QueryDocumentSnapshot<DocumentData>
): ICandidate => {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    email: data.email,
    phone: data.phone ?? "",
    position: data.position,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const candidatesService = createCrudService<ICandidate, CandidateInput>(
  "candidates",
  mapCandidate
);

export function subscribeToCandidates(
  status: CandidateStatus | "all",
  onChange: (candidates: ICandidate[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return candidatesService.subscribe(status, onChange, onError);
}

export async function createCandidate(
  input: CandidateInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return candidatesService.create(input, owner);
}

export async function updateCandidate(
  candidateId: string,
  input: Partial<CandidateInput>
): Promise<void> {
  return candidatesService.update(candidateId, input);
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  return candidatesService.remove(candidateId);
}

export async function getCandidatesInScreeningCount(): Promise<number> {
  return candidatesService.countByStatus("triagem");
}
