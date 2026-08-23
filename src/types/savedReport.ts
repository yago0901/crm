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

export interface ISavedReport {
  id: string;
  name: string;
  source: ReportSource;
  statusFilter: string;
  notes?: string;
  ownerId: string;
  ownerName?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type SavedReportInput = Pick<
  ISavedReport,
  "name" | "source" | "statusFilter" | "notes"
>;
