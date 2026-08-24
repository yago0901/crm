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
import { getCurrentCompanyId } from "../shared/tenant";
import { IProject, ProjectInput, ProjectStatus } from "../../types/project";

export const mapProject = (
  snap: QueryDocumentSnapshot<DocumentData>
): IProject => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
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
  return projectsService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createProject(
  input: ProjectInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return projectsService.create(input, owner, { companyId: getCurrentCompanyId() });
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
  return projectsService.countByStatus("em_andamento", getCurrentCompanyId() ?? undefined);
}

export async function fetchActiveProjects(): Promise<IProject[]> {
  const companyId = getCurrentCompanyId();
  const constraints = [
    ...(companyId ? [where("companyId", "==", companyId)] : []),
    where("status", "==", "em_andamento"),
    orderBy("name", "asc"),
  ];
  const q = query(projectsService.ref, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapProject);
}
