import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import {
  createQualityCheck,
  deleteQualityCheck,
  getFailedQualityChecksCount,
  mapQualityCheck,
  updateQualityCheck,
} from "../../../services/producao-manufatura/qualityChecks";
import { IQualityCheck, QualityCheckInput, QualityCheckStatus } from "../../../types/qualityCheck";

const STATUS_LABEL: Record<QualityCheckStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_TONE: Record<QualityCheckStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  aprovado: "success",
  reprovado: "danger",
};

const EMPTY_FORM: QualityCheckInput = {
  item: "",
  category: "",
  inspector: "",
  inspectionDate: null,
  status: "pendente",
  notes: "",
};

const schema: ResourceSchema<IQualityCheck, QualityCheckInput> = {
  pageTitle: "Controle de Qualidade",
  newLabel: "Nova inspeção",
  entityLabel: "inspeção",
  loadingMessage: "Carregando inspeções...",
  emptyMessage: "Nenhuma inspeção encontrada.",
  messages: {
    created: "Inspeção registrada com sucesso.",
    updated: "Inspeção atualizada com sucesso.",
    deleted: "Inspeção excluída.",
  },

  collectionPath: "qualityChecks",
  mapDoc: mapQualityCheck,
  orderByField: "inspectionDate",
  orderDirection: "desc",
  filterOptions: [
    { value: "pendente", label: "Pendente" },
    { value: "aprovado", label: "Aprovado" },
    { value: "reprovado", label: "Reprovado" },
  ],

  columns: [
    { key: "item", label: "Item", render: (c) => c.item },
    { key: "category", label: "Categoria", render: (c) => c.category || "—" },
    { key: "inspector", label: "Inspetor", render: (c) => c.inspector || "—" },
    { key: "inspectionDate", label: "Data", render: (c) => toDateInput(c.inspectionDate) || "—" },
    {
      key: "status",
      label: "Status",
      render: (c) => <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>,
    },
  ],

  fields: [
    { key: "item", label: "Item", kind: "text", required: true },
    { key: "category", label: "Categoria", kind: "text" },
    { key: "inspector", label: "Inspetor", kind: "text" },
    { key: "inspectionDate", label: "Data da inspeção", kind: "date" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "pendente", label: "Pendente" },
        { value: "aprovado", label: "Aprovado" },
        { value: "reprovado", label: "Reprovado" },
      ],
    },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (c) => ({
    item: c.item,
    category: c.category,
    inspector: c.inspector,
    inspectionDate: c.inspectionDate,
    status: c.status,
    notes: c.notes,
  }),
  getRowLabel: (c) => c.item,

  create: createQualityCheck,
  update: updateQualityCheck,
  remove: deleteQualityCheck,

  summary: {
    label: "Reprovações",
    fetch: getFailedQualityChecksCount,
  },
};

export default function ControleQualidade() {
  return <ResourcePage schema={schema} />;
}
