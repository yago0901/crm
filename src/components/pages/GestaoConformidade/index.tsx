import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import {
  createComplianceItem,
  deleteComplianceItem,
  getNonConformitiesCount,
  mapComplianceItem,
  updateComplianceItem,
} from "../../../services/compliance/complianceItems";
import { ComplianceItemInput, ComplianceStatus, IComplianceItem } from "../../../types/complianceItem";

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  conforme: "Conforme",
  nao_conforme: "Não conforme",
  em_analise: "Em análise",
};

const STATUS_TONE: Record<ComplianceStatus, "success" | "danger" | "warning"> = {
  conforme: "success",
  nao_conforme: "danger",
  em_analise: "warning",
};

const EMPTY_FORM: ComplianceItemInput = {
  title: "",
  category: "",
  responsible: "",
  reviewDate: null,
  status: "em_analise",
  notes: "",
};

const schema: ResourceSchema<IComplianceItem, ComplianceItemInput> = {
  pageTitle: "Gestão de Conformidade",
  newLabel: "Novo item",
  entityLabel: "item",
  loadingMessage: "Carregando itens...",
  emptyMessage: "Nenhum item de conformidade encontrado.",
  messages: {
    created: "Item de conformidade criado.",
    updated: "Item de conformidade atualizado.",
    deleted: "Item excluído.",
  },

  collectionPath: "complianceItems",
  mapDoc: mapComplianceItem,
  orderByField: "reviewDate",
  orderDirection: "asc",
  filterOptions: [
    { value: "conforme", label: "Conforme" },
    { value: "nao_conforme", label: "Não conforme" },
    { value: "em_analise", label: "Em análise" },
  ],

  columns: [
    { key: "title", label: "Item", render: (i) => i.title },
    { key: "category", label: "Categoria", render: (i) => i.category || "—" },
    { key: "responsible", label: "Responsável", render: (i) => i.responsible || "—" },
    { key: "reviewDate", label: "Revisão", render: (i) => toDateInput(i.reviewDate) || "—" },
    {
      key: "status",
      label: "Status",
      render: (i) => <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>,
    },
  ],

  fields: [
    { key: "title", label: "Item", kind: "text", required: true },
    { key: "category", label: "Categoria", kind: "text" },
    { key: "responsible", label: "Responsável", kind: "text" },
    { key: "reviewDate", label: "Data de revisão", kind: "date" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "conforme", label: "Conforme" },
        { value: "nao_conforme", label: "Não conforme" },
        { value: "em_analise", label: "Em análise" },
      ],
    },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (i) => ({
    title: i.title,
    category: i.category,
    responsible: i.responsible,
    reviewDate: i.reviewDate,
    status: i.status,
    notes: i.notes,
  }),
  getRowLabel: (i) => i.title,

  create: createComplianceItem,
  update: updateComplianceItem,
  remove: deleteComplianceItem,

  summary: {
    label: "Não conformidades",
    fetch: getNonConformitiesCount,
    tone: (value) => (value > 0 ? "danger" : "success"),
  },
};

export default function GestaoConformidade() {
  return <ResourcePage schema={schema} />;
}
