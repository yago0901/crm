import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import {
  createMaintenanceRequest,
  deleteMaintenanceRequest,
  getScheduledMaintenanceCount,
  mapMaintenanceRequest,
  updateMaintenanceRequest,
} from "../../../services/producao-manufatura/maintenanceRequests";
import { IMaintenanceRequest, MaintenanceRequestInput, MaintenanceRequestStatus } from "../../../types/maintenanceRequest";

const STATUS_LABEL: Record<MaintenanceRequestStatus, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_TONE: Record<MaintenanceRequestStatus, "info" | "warning" | "success" | "danger"> = {
  agendada: "info",
  em_andamento: "warning",
  concluida: "success",
  cancelada: "danger",
};

const EMPTY_FORM: MaintenanceRequestInput = {
  equipmentName: "",
  description: "",
  technician: "",
  scheduledDate: null,
  status: "agendada",
  notes: "",
};

const schema: ResourceSchema<IMaintenanceRequest, MaintenanceRequestInput> = {
  pageTitle: "Manutenção de Equipamentos",
  newLabel: "Nova manutenção",
  entityLabel: "manutenção",
  loadingMessage: "Carregando manutenções...",
  emptyMessage: "Nenhuma manutenção encontrada.",
  messages: {
    created: "Manutenção registrada com sucesso.",
    updated: "Manutenção atualizada com sucesso.",
    deleted: "Manutenção excluída.",
  },

  collectionPath: "maintenanceRequests",
  mapDoc: mapMaintenanceRequest,
  orderByField: "scheduledDate",
  orderDirection: "asc",
  filterOptions: [
    { value: "agendada", label: "Agendada" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "concluida", label: "Concluída" },
    { value: "cancelada", label: "Cancelada" },
  ],

  columns: [
    { key: "equipmentName", label: "Equipamento", render: (r) => r.equipmentName },
    { key: "description", label: "Descrição", render: (r) => r.description || "—" },
    { key: "technician", label: "Técnico", render: (r) => r.technician || "—" },
    { key: "scheduledDate", label: "Agendada para", render: (r) => toDateInput(r.scheduledDate) || "—" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
    },
  ],

  fields: [
    { key: "equipmentName", label: "Equipamento", kind: "text", required: true },
    { key: "technician", label: "Técnico", kind: "text" },
    { key: "scheduledDate", label: "Data agendada", kind: "date" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "agendada", label: "Agendada" },
        { value: "em_andamento", label: "Em andamento" },
        { value: "concluida", label: "Concluída" },
        { value: "cancelada", label: "Cancelada" },
      ],
    },
    { key: "description", label: "Descrição", kind: "textarea", fullWidth: true },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (r) => ({
    equipmentName: r.equipmentName,
    description: r.description,
    technician: r.technician,
    scheduledDate: r.scheduledDate,
    status: r.status,
    notes: r.notes,
  }),
  getRowLabel: (r) => r.equipmentName,

  create: createMaintenanceRequest,
  update: updateMaintenanceRequest,
  remove: deleteMaintenanceRequest,

  summary: {
    label: "Agendadas",
    fetch: getScheduledMaintenanceCount,
  },
};

export default function ManutencaoEquipamentos() {
  return <ResourcePage schema={schema} />;
}
