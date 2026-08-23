import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { ITraining, TrainingInput, TrainingStatus } from "../types/training";

export const mapTraining = (
  snap: QueryDocumentSnapshot<DocumentData>
): ITraining => {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    description: data.description ?? "",
    category: data.category ?? "",
    date: data.date ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const trainingsService = createCrudService<ITraining, TrainingInput>(
  "trainings",
  mapTraining,
  { orderByField: "date", orderDirection: "asc" }
);

export function subscribeToTrainings(
  status: TrainingStatus | "all",
  onChange: (trainings: ITraining[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return trainingsService.subscribe(status, onChange, onError);
}

export async function createTraining(
  input: TrainingInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return trainingsService.create(input, owner);
}

export async function updateTraining(
  trainingId: string,
  input: Partial<TrainingInput>
): Promise<void> {
  return trainingsService.update(trainingId, input);
}

export async function deleteTraining(trainingId: string): Promise<void> {
  return trainingsService.remove(trainingId);
}

export async function getScheduledTrainingsCount(): Promise<number> {
  return trainingsService.countByStatus("planejado");
}
