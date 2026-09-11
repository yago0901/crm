import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import {
  createRegulation,
  deleteRegulation,
  getOverdueRegulationsCount,
  mapRegulation,
  updateRegulation,
} from "../../../services/compliance/regulations";
import { IRegulation, RegulationInput, RegulationStatus } from "../../../types/regulation";

const STATUS_LABEL: Record<RegulationStatus, string> = {
  pendente: "Pendente",
  atendido: "Atendido",
  vencido: "Vencido",
};

const STATUS_TONE: Record<RegulationStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  atendido: "success",
  vencido: "danger",
};

const EMPTY_FORM: RegulationInput = {
  name: "",
  category: "",
  responsible: "",
  deadline: null,
  status: "pendente",
  notes: "",
};

const schema: ResourceSchema<IRegulation, RegulationInput> = {
  pageTitle: "Controle de Regulamentações",
  newLabel: "Nova regulamentação",
  entityLabel: "regulamentação",
  loadingMessage: "Carregando regulamentações...",
  emptyMessage: "Nenhuma regulamentação encontrada.",
  messages: {
    created: "Regulamentação criada com sucesso.",
    updated: "Regulamentação atualizada com sucesso.",
    deleted: "Regulamentação excluída.",
  },

  collectionPath: "regulations",
  mapDoc: mapRegulation,
  orderByField: "deadline",
  orderDirection: "asc",
  filterOptions: [
    { value: "pendente", label: "Pendente" },
    { value: "atendido", label: "Atendido" },
    { value: "vencido", label: "Vencido" },
  ],

  columns: [
    { key: "name", label: "Regulamentação", render: (r) => r.name },
    { key: "category", label: "Categoria", render: (r) => r.category || "—" },
    { key: "responsible", label: "Responsável", render: (r) => r.responsible || "—" },
    { key: "deadline", label: "Prazo", render: (r) => toDateInput(r.deadline) || "—" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
    },
  ],

  fields: [
    { key: "name", label: "Regulamentação", kind: "text", required: true },
    { key: "category", label: "Categoria", kind: "text" },
    { key: "responsible", label: "Responsável", kind: "text" },
    { key: "deadline", label: "Prazo", kind: "date" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "pendente", label: "Pendente" },
        { value: "atendido", label: "Atendido" },
        { value: "vencido", label: "Vencido" },
      ],
    },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (r) => ({
    name: r.name,
    category: r.category,
    responsible: r.responsible,
    deadline: r.deadline,
    status: r.status,
    notes: r.notes,
  }),
  getRowLabel: (r) => r.name,

  create: createRegulation,
  update: updateRegulation,
  remove: deleteRegulation,

  summary: {
    label: "Vencidas",
    fetch: getOverdueRegulationsCount,
    tone: (value) => (value > 0 ? "danger" : "success"),
  },
};

export default function ControleRegulamentacoes() {
  return <ResourcePage schema={schema} />;
}
