import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { IProjectTask, ProjectTaskInput, ProjectTaskStatus } from "../../types/projectTask";

export const mapProjectTask = (
  snap: QueryDocumentSnapshot<DocumentData>
): IProjectTask => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    projectId: data.projectId,
    projectName: data.projectName ?? "",
    title: data.title,
    assignee: data.assignee ?? "",
    dueDate: data.dueDate ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const projectTasksService = createCrudService<IProjectTask, ProjectTaskInput>(
  "projectTasks",
  mapProjectTask,
  { orderByField: "dueDate", orderDirection: "asc" }
);

export function subscribeToProjectTasks(
  status: ProjectTaskStatus | "all",
  onChange: (tasks: IProjectTask[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return projectTasksService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createProjectTask(
  input: ProjectTaskInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return projectTasksService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updateProjectTask(
  taskId: string,
  input: Partial<ProjectTaskInput>
): Promise<void> {
  return projectTasksService.update(taskId, input);
}

export async function deleteProjectTask(taskId: string): Promise<void> {
  return projectTasksService.remove(taskId);
}

export async function getBacklogTasksCount(): Promise<number> {
  return projectTasksService.countByStatus("a_fazer", getCurrentCompanyId() ?? undefined);
}
