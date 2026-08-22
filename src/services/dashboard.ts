import {
  collection,
  count,
  getAggregateFromServer,
  getDocs,
  query,
  sum,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase";
import { ContactStatus } from "../types/contact";
import { ContractStatus } from "../types/contract";
import { EmployeeStatus } from "../types/employee";
import { FinanceStatus } from "../types/finance";
import { mapEmployee } from "./employees";
import { mapPayable, mapReceivable, getCashFlowSummary, IMonthlyCashFlow } from "./finance";

export interface IDashboardStats {
  leadsCount: number;
  clientesCount: number;
  contratosAtivosCount: number;
  valorContratosAtivos: number;
}

export async function getDashboardStats(): Promise<IDashboardStats> {
  const contactsRef = collection(firestore, "contacts");
  const contractsRef = collection(firestore, "contracts");

  const [leadsSnap, clientesSnap, contratosSnap] = await Promise.all([
    getAggregateFromServer(query(contactsRef, where("status", "==", "lead")), {
      total: count(),
    }),
    getAggregateFromServer(query(contactsRef, where("status", "==", "cliente")), {
      total: count(),
    }),
    getAggregateFromServer(query(contractsRef, where("status", "==", "ativo")), {
      total: count(),
      valor: sum("value"),
    }),
  ]);

  return {
    leadsCount: leadsSnap.data().total,
    clientesCount: clientesSnap.data().total,
    contratosAtivosCount: contratosSnap.data().total,
    valorContratosAtivos: contratosSnap.data().valor,
  };
}

export interface IStatusCount {
  status: string;
  count: number;
}

export async function getContactStatusBreakdown(): Promise<IStatusCount[]> {
  const statuses: ContactStatus[] = ["lead", "cliente", "inativo"];
  const ref = collection(firestore, "contacts");

  const results = await Promise.all(
    statuses.map((status) =>
      getAggregateFromServer(query(ref, where("status", "==", status)), {
        total: count(),
      })
    )
  );

  return statuses.map((status, i) => ({ status, count: results[i].data().total }));
}

export async function getContractStatusBreakdown(): Promise<IStatusCount[]> {
  const statuses: ContractStatus[] = ["rascunho", "ativo", "encerrado", "cancelado"];
  const ref = collection(firestore, "contracts");

  const results = await Promise.all(
    statuses.map((status) =>
      getAggregateFromServer(query(ref, where("status", "==", status)), {
        total: count(),
      })
    )
  );

  return statuses.map((status, i) => ({ status, count: results[i].data().total }));
}

export async function getMonthlyCashFlow(): Promise<IMonthlyCashFlow[]> {
  const [payablesSnap, receivablesSnap] = await Promise.all([
    getDocs(collection(firestore, "payables")),
    getDocs(collection(firestore, "receivables")),
  ]);

  const payables = payablesSnap.docs.map(mapPayable);
  const receivables = receivablesSnap.docs.map(mapReceivable);

  return getCashFlowSummary(payables, receivables).months;
}

export async function getEmployeeStatusBreakdown(): Promise<IStatusCount[]> {
  const statuses: EmployeeStatus[] = ["ativo", "ferias", "desligado"];
  const ref = collection(firestore, "employees");

  const results = await Promise.all(
    statuses.map((status) =>
      getAggregateFromServer(query(ref, where("status", "==", status)), {
        total: count(),
      })
    )
  );

  return statuses.map((status, i) => ({ status, count: results[i].data().total }));
}

export async function getFinanceStatusBreakdown(): Promise<IStatusCount[]> {
  const statuses: FinanceStatus[] = ["pendente", "atrasado", "pago"];
  const payablesRef = collection(firestore, "payables");
  const receivablesRef = collection(firestore, "receivables");

  const results = await Promise.all(
    statuses.map((status) =>
      Promise.all([
        getAggregateFromServer(query(payablesRef, where("status", "==", status)), {
          total: count(),
        }),
        getAggregateFromServer(query(receivablesRef, where("status", "==", status)), {
          total: count(),
        }),
      ])
    )
  );

  return statuses.map((status, i) => ({
    status,
    count: results[i][0].data().total + results[i][1].data().total,
  }));
}

export interface IDepartmentPayroll {
  department: string;
  total: number;
}

export async function getPayrollByDepartment(): Promise<IDepartmentPayroll[]> {
  const snap = await getDocs(
    query(collection(firestore, "employees"), where("status", "==", "ativo"))
  );
  const employees = snap.docs.map(mapEmployee);

  const totals = new Map<string, number>();
  employees.forEach((employee) => {
    const department = employee.department || "Sem departamento";
    totals.set(department, (totals.get(department) ?? 0) + employee.salary);
  });

  return Array.from(totals.entries())
    .map(([department, total]) => ({ department, total }))
    .sort((a, b) => b.total - a.total);
}
