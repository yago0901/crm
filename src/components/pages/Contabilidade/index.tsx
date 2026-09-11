import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import { currency } from "../../../utils/format";
import {
  createLedgerEntry,
  deleteLedgerEntry,
  getLedgerBalance,
  mapLedgerEntry,
  updateLedgerEntry,
} from "../../../services/financeiro/ledger";
import { ILedgerEntry, LedgerEntryInput, LedgerEntryType } from "../../../types/ledgerEntry";

const TYPE_LABEL: Record<LedgerEntryType, string> = {
  debito: "Débito",
  credito: "Crédito",
};

const TYPE_TONE: Record<LedgerEntryType, "danger" | "success"> = {
  debito: "danger",
  credito: "success",
};

const EMPTY_FORM: LedgerEntryInput = {
  description: "",
  category: "",
  type: "debito",
  value: 0,
  date: null,
  notes: "",
};

const schema: ResourceSchema<ILedgerEntry, LedgerEntryInput> = {
  pageTitle: "Contabilidade",
  newLabel: "Novo lançamento",
  entityLabel: "lançamento",
  loadingMessage: "Carregando lançamentos...",
  emptyMessage: "Nenhum lançamento contábil encontrado.",
  messages: {
    created: "Lançamento criado com sucesso.",
    updated: "Lançamento atualizado com sucesso.",
    deleted: "Lançamento excluído.",
  },

  collectionPath: "ledgerEntries",
  mapDoc: mapLedgerEntry,
  orderByField: "date",
  orderDirection: "desc",
  filterField: "type",
  filterOptions: [
    { value: "credito", label: "Crédito" },
    { value: "debito", label: "Débito" },
  ],

  columns: [
    { key: "description", label: "Descrição", render: (e) => e.description },
    { key: "category", label: "Categoria", render: (e) => e.category || "—" },
    { key: "type", label: "Tipo", render: (e) => <Badge tone={TYPE_TONE[e.type]}>{TYPE_LABEL[e.type]}</Badge> },
    { key: "value", label: "Valor", render: (e) => currency.format(e.value) },
    { key: "date", label: "Data", render: (e) => toDateInput(e.date) || "—" },
  ],

  fields: [
    { key: "description", label: "Descrição", kind: "text", required: true },
    { key: "category", label: "Categoria", kind: "text" },
    {
      key: "type",
      label: "Tipo",
      kind: "select",
      options: [
        { value: "debito", label: "Débito" },
        { value: "credito", label: "Crédito" },
      ],
    },
    { key: "value", label: "Valor (R$)", kind: "number", required: true },
    { key: "date", label: "Data", kind: "date" },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (e) => ({
    description: e.description,
    category: e.category,
    type: e.type,
    value: e.value,
    date: e.date,
    notes: e.notes,
  }),
  getRowLabel: (e) => e.description,

  create: createLedgerEntry,
  update: updateLedgerEntry,
  remove: deleteLedgerEntry,

  summary: {
    label: "Saldo contábil",
    fetch: getLedgerBalance,
    tone: (value) => (value >= 0 ? "success" : "danger"),
    format: (value) => currency.format(value),
  },
};

export default function Contabilidade() {
  return <ResourcePage schema={schema} />;
}
