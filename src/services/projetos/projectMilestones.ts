import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import {
  IProjectMilestone,
  ProjectMilestoneInput,
  ProjectMilestoneStatus,
} from "../../types/projectMilestone";

export const mapProjectMilestone = (
  snap: QueryDocumentSnapshot<DocumentData>
): IProjectMilestone => {
  const data = snap.data();
  return {
    id: snap.id,
    projectId: data.projectId,
    projectName: data.projectName ?? "",
    title: data.title,
    dueDate: data.dueDate ?? null,
    estimatedCost: data.estimatedCost ?? 0,
    actualCost: data.actualCost ?? 0,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const projectMilestonesService = createCrudService<
  IProjectMilestone,
  ProjectMilestoneInput
>("projectMilestones", mapProjectMilestone, {
  orderByField: "dueDate",
  orderDirection: "asc",
});

export function subscribeToProjectMilestones(
  status: ProjectMilestoneStatus | "all",
  onChange: (milestones: IProjectMilestone[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return projectMilestonesService.subscribe(status, onChange, onError);
}

export async function createProjectMilestone(
  input: ProjectMilestoneInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return projectMilestonesService.create(input, owner);
}

export async function updateProjectMilestone(
  milestoneId: string,
  input: Partial<ProjectMilestoneInput>
): Promise<void> {
  return projectMilestonesService.update(milestoneId, input);
}

export async function deleteProjectMilestone(milestoneId: string): Promise<void> {
  return projectMilestonesService.remove(milestoneId);
}

export async function getDelayedMilestonesCount(): Promise<number> {
  return projectMilestonesService.countByStatus("atrasado");
}
