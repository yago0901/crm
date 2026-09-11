import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import {
  createDepartmentInitiative,
  deleteDepartmentInitiative,
  getActiveInitiativesCount,
  mapDepartmentInitiative,
  updateDepartmentInitiative,
} from "../../../services/colaboracao/departmentInitiatives";
import {
  DepartmentInitiativeInput,
  DepartmentInitiativeStatus,
  IDepartmentInitiative,
} from "../../../types/departmentInitiative";

const STATUS_LABEL: Record<DepartmentInitiativeStatus, string> = {
  proposta: "Proposta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const STATUS_TONE: Record<DepartmentInitiativeStatus, "info" | "warning" | "success"> = {
  proposta: "info",
  em_andamento: "warning",
  concluida: "success",
};

const EMPTY_FORM: DepartmentInitiativeInput = {
  title: "",
  departments: "",
  description: "",
  leadName: "",
  status: "proposta",
  notes: "",
};

const schema: ResourceSchema<IDepartmentInitiative, DepartmentInitiativeInput> = {
  pageTitle: "Colaboração de Departamentos",
  newLabel: "Nova iniciativa",
  entityLabel: "iniciativa",
  loadingMessage: "Carregando iniciativas...",
  emptyMessage: "Nenhuma iniciativa encontrada.",
  messages: {
    created: "Iniciativa criada com sucesso.",
    updated: "Iniciativa atualizada com sucesso.",
    deleted: "Iniciativa excluída.",
  },

  collectionPath: "departmentInitiatives",
  mapDoc: mapDepartmentInitiative,
  filterOptions: [
    { value: "proposta", label: "Proposta" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "concluida", label: "Concluída" },
  ],

  columns: [
    { key: "title", label: "Iniciativa", render: (i) => i.title },
    { key: "departments", label: "Departamentos", render: (i) => i.departments || "—" },
    { key: "leadName", label: "Responsável", render: (i) => i.leadName || "—" },
    {
      key: "status",
      label: "Status",
      render: (i) => <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>,
    },
  ],

  fields: [
    { key: "title", label: "Iniciativa", kind: "text", required: true },
    { key: "departments", label: "Departamentos envolvidos", kind: "text" },
    { key: "leadName", label: "Responsável", kind: "text" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "proposta", label: "Proposta" },
        { value: "em_andamento", label: "Em andamento" },
        { value: "concluida", label: "Concluída" },
      ],
    },
    { key: "description", label: "Descrição", kind: "textarea", fullWidth: true },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (i) => ({
    title: i.title,
    departments: i.departments,
    description: i.description,
    leadName: i.leadName,
    status: i.status,
    notes: i.notes,
  }),
  getRowLabel: (i) => i.title,

  create: createDepartmentInitiative,
  update: updateDepartmentInitiative,
  remove: deleteDepartmentInitiative,

  summary: {
    label: "Em andamento",
    fetch: getActiveInitiativesCount,
  },
};

export default function ColaboracaoDepartamentos() {
  return <ResourcePage schema={schema} />;
}
