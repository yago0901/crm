import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import {
  createInternalAudit,
  deleteInternalAudit,
  getPlannedAuditsCount,
  mapInternalAudit,
  updateInternalAudit,
} from "../../../services/compliance/internalAudits";
import { IInternalAudit, InternalAuditInput, InternalAuditStatus } from "../../../types/internalAudit";

const STATUS_LABEL: Record<InternalAuditStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const STATUS_TONE: Record<InternalAuditStatus, "info" | "warning" | "success"> = {
  planejada: "info",
  em_andamento: "warning",
  concluida: "success",
};

const EMPTY_FORM: InternalAuditInput = {
  title: "",
  department: "",
  auditor: "",
  auditDate: null,
  status: "planejada",
  findings: "",
  notes: "",
};

const schema: ResourceSchema<IInternalAudit, InternalAuditInput> = {
  pageTitle: "Auditoria Interna",
  newLabel: "Nova auditoria",
  entityLabel: "auditoria",
  loadingMessage: "Carregando auditorias...",
  emptyMessage: "Nenhuma auditoria encontrada.",
  messages: {
    created: "Auditoria criada com sucesso.",
    updated: "Auditoria atualizada com sucesso.",
    deleted: "Auditoria excluída.",
  },

  collectionPath: "internalAudits",
  mapDoc: mapInternalAudit,
  orderByField: "auditDate",
  orderDirection: "desc",
  filterOptions: [
    { value: "planejada", label: "Planejada" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "concluida", label: "Concluída" },
  ],

  columns: [
    { key: "title", label: "Auditoria", render: (a) => a.title },
    { key: "department", label: "Departamento", render: (a) => a.department || "—" },
    { key: "auditor", label: "Auditor", render: (a) => a.auditor || "—" },
    { key: "auditDate", label: "Data", render: (a) => toDateInput(a.auditDate) || "—" },
    {
      key: "status",
      label: "Status",
      render: (a) => <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>,
    },
  ],

  fields: [
    { key: "title", label: "Auditoria", kind: "text", required: true },
    { key: "department", label: "Departamento", kind: "text" },
    { key: "auditor", label: "Auditor", kind: "text" },
    { key: "auditDate", label: "Data", kind: "date" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "planejada", label: "Planejada" },
        { value: "em_andamento", label: "Em andamento" },
        { value: "concluida", label: "Concluída" },
      ],
    },
    { key: "findings", label: "Conclusões", kind: "textarea", fullWidth: true },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (a) => ({
    title: a.title,
    department: a.department,
    auditor: a.auditor,
    auditDate: a.auditDate,
    status: a.status,
    findings: a.findings,
    notes: a.notes,
  }),
  getRowLabel: (a) => a.title,

  create: createInternalAudit,
  update: updateInternalAudit,
  remove: deleteInternalAudit,

  summary: {
    label: "Planejadas",
    fetch: getPlannedAuditsCount,
  },
};

export default function AuditoriaInterna() {
  return <ResourcePage schema={schema} />;
}
