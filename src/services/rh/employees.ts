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
import { EmployeeInput, EmployeeStatus, IEmployee } from "../../types/employee";

export const mapEmployee = (
  snap: QueryDocumentSnapshot<DocumentData>
): IEmployee => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    name: data.name,
    email: data.email,
    phone: data.phone ?? "",
    role: data.role,
    department: data.department,
    status: data.status,
    salary: data.salary ?? 0,
    hireDate: data.hireDate ?? null,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const employeesService = createCrudService<IEmployee, EmployeeInput>(
  "employees",
  mapEmployee
);

export function subscribeToEmployees(
  status: EmployeeStatus | "all",
  onChange: (employees: IEmployee[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return employeesService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createEmployee(
  input: EmployeeInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return employeesService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updateEmployee(
  employeeId: string,
  input: Partial<EmployeeInput>
): Promise<void> {
  return employeesService.update(employeeId, input);
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  return employeesService.remove(employeeId);
}

export async function getActivePayrollTotal(): Promise<number> {
  return employeesService.sumByStatus("salary", "ativo", getCurrentCompanyId() ?? undefined);
}

export async function fetchActiveEmployees(): Promise<IEmployee[]> {
  const companyId = getCurrentCompanyId();
  const constraints = [
    ...(companyId ? [where("companyId", "==", companyId)] : []),
    where("status", "==", "ativo"),
    orderBy("name", "asc"),
  ];
  const q = query(employeesService.ref, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapEmployee);
}
