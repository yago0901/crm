import {
  DocumentData,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  Unsubscribe,
  where,
} from "firebase/firestore";
import { createCrudService } from "./crudFactory";
import { EmployeeInput, EmployeeStatus, IEmployee } from "../types/employee";

export const mapEmployee = (
  snap: QueryDocumentSnapshot<DocumentData>
): IEmployee => {
  const data = snap.data();
  return {
    id: snap.id,
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
  return employeesService.subscribe(status, onChange, onError);
}

export async function createEmployee(
  input: EmployeeInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return employeesService.create(input, owner);
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
  return employeesService.sumByStatus("salary", "ativo");
}

export async function fetchActiveEmployees(): Promise<IEmployee[]> {
  const q = query(
    employeesService.ref,
    where("status", "==", "ativo"),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapEmployee);
}
