import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getAggregateFromServer,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  sum,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase";
import { EmployeeInput, EmployeeStatus, IEmployee } from "../types/employee";

const employeesRef = collection(firestore, "employees");

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

export function subscribeToEmployees(
  status: EmployeeStatus | "all",
  onChange: (employees: IEmployee[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const constraints = [orderBy("createdAt", "desc")];
  const q =
    status === "all"
      ? query(employeesRef, ...constraints)
      : query(employeesRef, where("status", "==", status), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapEmployee)),
    (error) => onError?.(error)
  );
}

export async function createEmployee(
  input: EmployeeInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  const docRef = await addDoc(employeesRef, {
    ...input,
    ownerId: owner.uid,
    ownerName: owner.name ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateEmployee(
  employeeId: string,
  input: Partial<EmployeeInput>
): Promise<void> {
  await updateDoc(doc(firestore, "employees", employeeId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  await deleteDoc(doc(firestore, "employees", employeeId));
}

export async function getActivePayrollTotal(): Promise<number> {
  const snap = await getAggregateFromServer(
    query(employeesRef, where("status", "==", "ativo")),
    { total: sum("salary") }
  );
  return snap.data().total;
}
