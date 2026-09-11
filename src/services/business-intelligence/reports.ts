import {
  collection,
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  Timestamp,
  Unsubscribe,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import {
  EMPTY_REPORT_CONFIG,
  IReportConfig,
  IReportFilter,
  ISavedReport,
  ReportAggregationFn,
  ReportFieldType,
  ReportSource,
  SavedReportInput,
} from "../../types/savedReport";

export interface IReportField {
  key: string;
  label: string;
  type: ReportFieldType;
  enumValues?: string[];
  money?: boolean;
}

export interface IReportSourceConfig {
  label: string;
  dateField: string;
  dateFieldLabel: string;
  fields: IReportField[];
}

const dateField = (key: string, label: string): IReportField => ({ key, label, type: "date" });
const num = (key: string, label: string, money = false): IReportField => ({
  key,
  label,
  type: "number",
  money,
});
const str = (key: string, label: string): IReportField => ({ key, label, type: "string" });
const en = (key: string, label: string, enumValues: string[]): IReportField => ({
  key,
  label,
  type: "enum",
  enumValues,
});

const FINANCE_STATUSES = [
  "pendente",
  "parcialmente_pago",
  "pago",
  "atrasado",
  "cancelado",
  "renegociado",
  "estornado",
];
const PAYMENT_METHODS = ["boleto", "pix", "cartao", "transferencia", "dinheiro", "outro"];

export const REPORT_SOURCES: Record<ReportSource, IReportSourceConfig> = {
  contacts: {
    label: "Contatos",
    dateField: "createdAt",
    dateFieldLabel: "data de cadastro",
    fields: [
      str("name", "Nome"),
      str("email", "E-mail"),
      str("phone", "Telefone"),
      en("status", "Situação", ["lead", "cliente", "inativo"]),
      dateField("createdAt", "Cadastrado em"),
    ],
  },
  contracts: {
    label: "Contratos",
    dateField: "createdAt",
    dateFieldLabel: "data de criação",
    fields: [
      str("title", "Título"),
      str("contactName", "Contato"),
      num("value", "Valor", true),
      en("status", "Status", ["rascunho", "ativo", "encerrado", "cancelado"]),
      dateField("startDate", "Início"),
      dateField("endDate", "Término"),
      dateField("createdAt", "Criado em"),
    ],
  },
  payables: {
    label: "Contas a Pagar",
    dateField: "dueDate",
    dateFieldLabel: "vencimento",
    fields: [
      str("description", "Descrição"),
      str("supplier", "Fornecedor"),
      str("category", "Categoria"),
      num("value", "Valor", true),
      num("paidValue", "Valor pago", true),
      en("status", "Status", FINANCE_STATUSES),
      en("paymentMethod", "Forma de pagamento", PAYMENT_METHODS),
      str("bankAccount", "Conta bancária"),
      dateField("dueDate", "Vencimento"),
      dateField("competenceDate", "Competência"),
      dateField("paidAt", "Pago em"),
      dateField("createdAt", "Criado em"),
    ],
  },
  receivables: {
    label: "Contas a Receber",
    dateField: "dueDate",
    dateFieldLabel: "vencimento",
    fields: [
      str("description", "Descrição"),
      str("contactName", "Cliente"),
      str("category", "Categoria"),
      num("value", "Valor", true),
      num("paidValue", "Valor recebido", true),
      en("status", "Status", FINANCE_STATUSES),
      en("paymentMethod", "Forma de pagamento", PAYMENT_METHODS),
      str("bankAccount", "Conta bancária"),
      dateField("dueDate", "Vencimento"),
      dateField("competenceDate", "Competência"),
      dateField("receivedAt", "Recebido em"),
      dateField("createdAt", "Criado em"),
    ],
  },
  employees: {
    label: "Funcionários",
    dateField: "hireDate",
    dateFieldLabel: "data de admissão",
    fields: [
      str("name", "Nome"),
      str("email", "E-mail"),
      str("role", "Cargo"),
      str("department", "Departamento"),
      en("status", "Status", ["ativo", "ferias", "desligado"]),
      num("salary", "Salário", true),
      num("commissionRate", "% de comissão"),
      num("costPerHour", "Custo/hora", true),
      en("contractType", "Tipo de contrato", [
        "clt",
        "pj",
        "estagio",
        "temporario",
        "terceirizado",
      ]),
      str("costCenter", "Centro de custo"),
      dateField("hireDate", "Admissão"),
      dateField("createdAt", "Cadastrado em"),
    ],
  },
  projects: {
    label: "Projetos",
    dateField: "createdAt",
    dateFieldLabel: "data de criação",
    fields: [
      str("name", "Nome"),
      num("budget", "Orçamento", true),
      en("status", "Status", ["planejamento", "em_andamento", "concluido", "cancelado"]),
      dateField("startDate", "Início"),
      dateField("endDate", "Término"),
      dateField("createdAt", "Criado em"),
    ],
  },
  inventoryItems: {
    label: "Estoque",
    dateField: "createdAt",
    dateFieldLabel: "data de cadastro",
    fields: [
      str("name", "Nome"),
      str("sku", "SKU"),
      str("category", "Categoria"),
      num("quantity", "Quantidade"),
      num("minQuantity", "Estoque mínimo"),
      str("unit", "Unidade"),
      num("unitCost", "Custo unitário", true),
      en("status", "Status", ["ativo", "descontinuado"]),
      dateField("createdAt", "Cadastrado em"),
    ],
  },
  suppliers: {
    label: "Fornecedores",
    dateField: "createdAt",
    dateFieldLabel: "data de cadastro",
    fields: [
      str("name", "Nome"),
      str("email", "E-mail"),
      str("category", "Categoria"),
      en("status", "Status", ["ativo", "inativo"]),
      dateField("createdAt", "Cadastrado em"),
    ],
  },
};

export function getField(source: ReportSource, key: string): IReportField | undefined {
  return REPORT_SOURCES[source].fields.find((f) => f.key === key);
}

export const mapSavedReport = (
  snap: QueryDocumentSnapshot<DocumentData>
): ISavedReport => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    name: data.name,
    source: data.source,
    config: { ...EMPTY_REPORT_CONFIG, ...(data.config ?? {}) },
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

export async function updateSavedReport(
  reportId: string,
  input: Partial<SavedReportInput>
): Promise<void> {
  return savedReportsService.update(reportId, input);
}

export async function deleteSavedReport(reportId: string): Promise<void> {
  return savedReportsService.remove(reportId);
}

// ---------- pure execution helpers ----------

const toComparable = (raw: unknown, type: ReportFieldType): number | string => {
  if (raw === null || raw === undefined) return type === "number" ? NaN : "";
  if (type === "date") {
    if (raw instanceof Timestamp) return raw.toMillis();
    const parsed = new Date(raw as string).getTime();
    return Number.isNaN(parsed) ? NaN : parsed;
  }
  if (type === "number") {
    const n = Number(raw);
    return Number.isNaN(n) ? NaN : n;
  }
  return String(raw).toLowerCase();
};

export function matchesFilter(
  row: DocumentData,
  filter: IReportFilter,
  field: IReportField
): boolean {
  const rawValue = row[filter.field];
  if (filter.operator === "contains") {
    return String(rawValue ?? "")
      .toLowerCase()
      .includes(filter.value.trim().toLowerCase());
  }

  const left = toComparable(rawValue, field.type);
  const right =
    field.type === "date"
      ? new Date(filter.value).getTime()
      : field.type === "number"
        ? Number(filter.value)
        : filter.value.trim().toLowerCase();

  switch (filter.operator) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
    default:
      return true;
  }
}

export function applyReportFilters(
  rows: DocumentData[],
  filters: IReportFilter[],
  fields: IReportField[]
): DocumentData[] {
  const active = filters.filter((f) => f.field && f.value.trim() !== "");
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every((filter) => {
      const field = fields.find((f) => f.key === filter.field);
      if (!field) return true;
      return matchesFilter(row, filter, field);
    })
  );
}

export function sortRows(
  rows: DocumentData[],
  sortField: string,
  sortDir: "asc" | "desc",
  fieldType: ReportFieldType
): DocumentData[] {
  if (!sortField) return rows;
  const dir = sortDir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = toComparable(a[sortField], fieldType);
    const bv = toComparable(b[sortField], fieldType);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

export interface IReportGroup {
  key: string;
  value: number;
}

export function groupAndAggregate(
  rows: DocumentData[],
  groupByField: string,
  fn: ReportAggregationFn,
  aggregationField: string
): IReportGroup[] {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const key = String(row[groupByField] ?? "—");
    const rawNum = fn === "count" ? 1 : Number(row[aggregationField]);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(Number.isNaN(rawNum) ? 0 : rawNum);
  }

  const groups: IReportGroup[] = [];
  for (const [key, values] of buckets) {
    let value: number;
    if (fn === "count") value = values.length;
    else if (fn === "sum") value = values.reduce((s, v) => s + v, 0);
    else value = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    groups.push({ key, value: Math.round(value * 100) / 100 });
  }
  return groups.sort((a, b) => b.value - a.value);
}

export function formatCellValue(raw: unknown, field: IReportField): string {
  if (raw === null || raw === undefined || raw === "") return "";
  if (field.type === "date") {
    const date = raw instanceof Timestamp ? raw.toDate() : new Date(raw as string);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }
  if (field.type === "number") {
    const n = Number(raw);
    if (Number.isNaN(n)) return "";
    return field.money
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : String(n);
  }
  return String(raw);
}

export function toCsv(columns: { key: string; label: string }[], rows: string[][]): string {
  const escape = (cell: string) =>
    /[",\n;]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
  const header = columns.map((c) => escape(c.label)).join(";");
  const body = rows.map((row) => row.map(escape).join(";"));
  return [header, ...body].join("\n");
}

export interface IReportRun {
  mode: "rows" | "grouped";
  columns: { key: string; label: string }[];
  rows: string[][];
  groups: IReportGroup[];
  total: number;
}

export async function runReport(
  source: ReportSource,
  config: IReportConfig
): Promise<IReportRun> {
  const sourceConfig = REPORT_SOURCES[source];
  const companyId = getCurrentCompanyId();
  const ref = collection(firestore, source);

  const constraints: QueryConstraint[] = companyId
    ? [where("companyId", "==", companyId)]
    : [];

  const usesDateRange = Boolean(config.dateFrom || config.dateTo);
  if (usesDateRange) {
    if (config.dateFrom) {
      constraints.push(where(sourceConfig.dateField, ">=", config.dateFrom));
    }
    if (config.dateTo) {
      constraints.push(where(sourceConfig.dateField, "<=", config.dateTo));
    }
    constraints.push(orderBy(sourceConfig.dateField, "asc"));
  }

  const snapshot = await getDocs(query(ref, ...constraints));
  let rows: DocumentData[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  rows = applyReportFilters(rows, config.filters, sourceConfig.fields);

  if (config.sortField) {
    const sortType = getField(source, config.sortField)?.type ?? "string";
    rows = sortRows(rows, config.sortField, config.sortDir, sortType);
  }

  if (config.groupByField) {
    const groups = groupAndAggregate(
      rows,
      config.groupByField,
      config.aggregationFn,
      config.aggregationField
    );
    const label = getField(source, config.groupByField)?.label ?? config.groupByField;
    const aggLabel =
      config.aggregationFn === "count"
        ? "Contagem"
        : `${config.aggregationFn === "sum" ? "Soma" : "Média"} de ${
            getField(source, config.aggregationField)?.label ?? config.aggregationField
          }`;
    return {
      mode: "grouped",
      columns: [
        { key: "key", label },
        { key: "value", label: aggLabel },
      ],
      rows: groups.map((g) => [g.key, String(g.value)]),
      groups,
      total: groups.reduce((s, g) => s + g.value, 0),
    };
  }

  const columnKeys = config.columns.length
    ? config.columns
    : sourceConfig.fields.slice(0, 4).map((f) => f.key);
  const columns = columnKeys.map((key) => ({
    key,
    label: getField(source, key)?.label ?? key,
  }));

  const displayRows = rows.map((row) =>
    columns.map((col) => {
      const field = getField(source, col.key);
      return field ? formatCellValue(row[col.key], field) : String(row[col.key] ?? "");
    })
  );

  return {
    mode: "rows",
    columns,
    rows: displayRows,
    groups: [],
    total: displayRows.length,
  };
}
