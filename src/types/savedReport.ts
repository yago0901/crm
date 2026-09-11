import { Timestamp } from "firebase/firestore";

export type ReportSource =
  | "contacts"
  | "contracts"
  | "payables"
  | "receivables"
  | "employees"
  | "projects"
  | "inventoryItems"
  | "suppliers";

export type ReportFieldType = "string" | "number" | "date" | "enum";

export type ReportOperator = "eq" | "neq" | "contains" | "gt" | "gte" | "lt" | "lte";

export type ReportAggregationFn = "count" | "sum" | "avg";

export interface IReportFilter {
  field: string;
  operator: ReportOperator;
  value: string;
}

export interface IReportConfig {
  columns: string[];
  filters: IReportFilter[];
  dateFrom: Timestamp | null;
  dateTo: Timestamp | null;
  groupByField: string;
  aggregationFn: ReportAggregationFn;
  aggregationField: string;
  sortField: string;
  sortDir: "asc" | "desc";
  chart: "none" | "bar" | "pie";
}

export const EMPTY_REPORT_CONFIG: IReportConfig = {
  columns: [],
  filters: [],
  dateFrom: null,
  dateTo: null,
  groupByField: "",
  aggregationFn: "count",
  aggregationField: "",
  sortField: "",
  sortDir: "asc",
  chart: "none",
};

export interface ISavedReport {
  id: string;
  companyId: string;
  name: string;
  source: ReportSource;
  config: IReportConfig;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type SavedReportInput = Pick<ISavedReport, "name" | "source" | "config" | "notes">;
