import {
  collection,
  DocumentData,
  getDocs,
  query,
  QueryDocumentSnapshot,
  Unsubscribe,
  where,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { ISavedReport, ReportSource, SavedReportInput } from "../../types/savedReport";

export interface IReportSourceConfig {
  label: string;
  labelField: string;
  statuses: string[];
}

export const REPORT_SOURCES: Record<ReportSource, IReportSourceConfig> = {
  contacts: { label: "Contatos", labelField: "name", statuses: ["lead", "cliente", "inativo"] },
  contracts: {
    label: "Contratos",
    labelField: "title",
    statuses: ["rascunho", "ativo", "encerrado", "cancelado"],
  },
  payables: {
    label: "Contas a Pagar",
    labelField: "description",
    statuses: ["pendente", "pago", "atrasado"],
  },
  receivables: {
    label: "Contas a Receber",
    labelField: "description",
    statuses: ["pendente", "pago", "atrasado"],
  },
  employees: {
    label: "Funcionários",
    labelField: "name",
    statuses: ["ativo", "ferias", "desligado"],
  },
  projects: {
    label: "Projetos",
    labelField: "name",
    statuses: ["planejamento", "em_andamento", "concluido", "cancelado"],
  },
  inventoryItems: {
    label: "Estoque",
    labelField: "name",
    statuses: ["ativo", "descontinuado"],
  },
  suppliers: { label: "Fornecedores", labelField: "name", statuses: ["ativo", "inativo"] },
};

export const mapSavedReport = (
  snap: QueryDocumentSnapshot<DocumentData>
): ISavedReport => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    name: data.name,
    source: data.source,
    statusFilter: data.statusFilter ?? "all",
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const savedReportsService = createCrudService<ISavedReport, SavedReportInput>(
  "savedReports",
  mapSavedReport
);

export function subscribeToSavedReports(
  onChange: (reports: ISavedReport[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return savedReportsService.subscribe("all", onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createSavedReport(
  input: SavedReportInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return savedReportsService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function deleteSavedReport(reportId: string): Promise<void> {
  return savedReportsService.remove(reportId);
}

export interface IReportResultItem {
  id: string;
  label: string;
  status?: string;
}

export interface IReportResult {
  count: number;
  items: IReportResultItem[];
}

export async function runReport(
  source: ReportSource,
  statusFilter: string
): Promise<IReportResult> {
  const ref = collection(firestore, source);
  const companyId = getCurrentCompanyId();
  const constraints = [
    ...(companyId ? [where("companyId", "==", companyId)] : []),
    ...(statusFilter === "all" ? [] : [where("status", "==", statusFilter)]),
  ];
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const { labelField } = REPORT_SOURCES[source];

  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      label: (data[labelField] as string) ?? doc.id,
      status: data.status as string | undefined,
    };
  });

  return { count: items.length, items };
}
