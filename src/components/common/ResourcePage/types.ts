import { ReactNode } from "react";

export interface ResourceColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

export interface ResourceFilterOption {
  value: string;
  label: string;
}

export type ResourceFieldKind = "text" | "email" | "number" | "date" | "select" | "textarea";

export interface ResourceFieldOption {
  value: string;
  label: string;
}

export interface ResourceFormField<TInput> {
  key: keyof TInput & string;
  label: string;
  kind: ResourceFieldKind;
  required?: boolean;
  options?: ResourceFieldOption[];
  fullWidth?: boolean;
}

export type ResourceSummaryTone = "default" | "success" | "danger";

export interface ResourceSummary {
  label: string;
  fetch: () => Promise<number>;
  tone?: (value: number) => ResourceSummaryTone;
  /** Defaults to the raw number — pass e.g. currency.format for a monetary summary. */
  format?: (value: number) => string;
}

export interface ResourceMessages {
  created: string;
  updated: string;
  deleted: string;
}

export interface ResourceOwner {
  uid: string;
  name?: string | null;
}

/**
 * Everything a plain "list + modal form" CRUD page needs, as data instead of
 * JSX. Feeds both useResourceCrud (state/handlers) and <ResourcePage>
 * (rendering). Deliberately does NOT try to derive Portuguese-gendered
 * strings (Novo/Nova, Nenhum/Nenhuma, singular/plural...) from entityLabel —
 * those stay explicit fields so wording is never accidentally changed by
 * the abstraction; only the structural boilerplate is shared.
 */
export interface ResourceSchema<T extends { id: string }, TInput extends object> {
  pageTitle: string;
  /** e.g. "Novo armazém" — used on the create button and as the create-modal title. */
  newLabel: string;
  /** Lowercase singular noun, e.g. "armazém" — used in "Editar {x}"/"Excluir {x}"/generic error text. */
  entityLabel: string;
  loadingMessage: string;
  emptyMessage: string;
  messages: ResourceMessages;

  collectionPath: string;
  mapDoc: (snap: import("firebase/firestore").QueryDocumentSnapshot<import("firebase/firestore").DocumentData>) => T;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  filterField?: string;
  filterOptions?: ResourceFilterOption[];

  columns: ResourceColumn<T>[];
  fields: ResourceFormField<TInput>[];
  emptyForm: TInput;
  toInput: (item: T) => TInput;
  getRowLabel: (item: T) => string;

  create: (input: TInput, owner: ResourceOwner) => Promise<string>;
  update: (id: string, input: Partial<TInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;

  summary?: ResourceSummary;
}
