import {
  DocumentData,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  Unsubscribe,
  where,
} from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { IProject, ProjectInput, ProjectStatus } from "../../types/project";

export const mapProject = (
  snap: QueryDocumentSnapshot<DocumentData>
): IProject => {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    description: data.description ?? "",
    budget: data.budget ?? 0,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const projectsService = createCrudService<IProject, ProjectInput>(
  "projects",
  mapProject,
  { orderByField: "startDate", orderDirection: "asc" }
);

export function subscribeToProjects(
  status: ProjectStatus | "all",
  onChange: (projects: IProject[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return projectsService.subscribe(status, onChange, onError);
}

export async function createProject(
  input: ProjectInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return projectsService.create(input, owner);
}

export async function updateProject(
  projectId: string,
  input: Partial<ProjectInput>
): Promise<void> {
  return projectsService.update(projectId, input);
}

export async function deleteProject(projectId: string): Promise<void> {
  return projectsService.remove(projectId);
}

export async function getActiveProjectsCount(): Promise<number> {
  return projectsService.countByStatus("em_andamento");
}

export async function fetchActiveProjects(): Promise<IProject[]> {
  const q = query(
    projectsService.ref,
    where("status", "==", "em_andamento"),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapProject);
}
