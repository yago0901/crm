import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import {
  createProductionPlan,
  deleteProductionPlan,
  getActiveProductionPlansCount,
  mapProductionPlan,
  updateProductionPlan,
} from "../../../services/producao-manufatura/productionPlans";
import { IProductionPlan, ProductionPlanInput, ProductionPlanStatus } from "../../../types/productionPlan";

const STATUS_LABEL: Record<ProductionPlanStatus, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<ProductionPlanStatus, "info" | "warning" | "success" | "danger"> = {
  planejado: "info",
  em_andamento: "warning",
  concluido: "success",
  cancelado: "danger",
};

const EMPTY_FORM: ProductionPlanInput = {
  productName: "",
  targetQuantity: 0,
  startDate: null,
  endDate: null,
  status: "planejado",
  notes: "",
};

const schema: ResourceSchema<IProductionPlan, ProductionPlanInput> = {
  pageTitle: "Planejamento de Produção",
  newLabel: "Novo plano de produção",
  entityLabel: "plano de produção",
  loadingMessage: "Carregando planos...",
  emptyMessage: "Nenhum plano de produção encontrado.",
  messages: {
    created: "Plano de produção criado.",
    updated: "Plano de produção atualizado.",
    deleted: "Plano de produção excluído.",
  },

  collectionPath: "productionPlans",
  mapDoc: mapProductionPlan,
  orderByField: "startDate",
  orderDirection: "asc",
  filterOptions: [
    { value: "planejado", label: "Planejado" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "concluido", label: "Concluído" },
    { value: "cancelado", label: "Cancelado" },
  ],

  columns: [
    { key: "productName", label: "Produto", render: (p) => p.productName },
    { key: "targetQuantity", label: "Qtd. alvo", render: (p) => p.targetQuantity },
    { key: "startDate", label: "Início", render: (p) => toDateInput(p.startDate) || "—" },
    { key: "endDate", label: "Término", render: (p) => toDateInput(p.endDate) || "—" },
    {
      key: "status",
      label: "Status",
      render: (p) => <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>,
    },
  ],

  fields: [
    { key: "productName", label: "Produto", kind: "text", required: true },
    { key: "targetQuantity", label: "Quantidade alvo", kind: "number", required: true },
    { key: "startDate", label: "Início", kind: "date" },
    { key: "endDate", label: "Término", kind: "date" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "planejado", label: "Planejado" },
        { value: "em_andamento", label: "Em andamento" },
        { value: "concluido", label: "Concluído" },
        { value: "cancelado", label: "Cancelado" },
      ],
    },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (p) => ({
    productName: p.productName,
    targetQuantity: p.targetQuantity,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
    notes: p.notes,
  }),
  getRowLabel: (p) => p.productName,

  create: createProductionPlan,
  update: updateProductionPlan,
  remove: deleteProductionPlan,

  summary: {
    label: "Em andamento",
    fetch: getActiveProductionPlansCount,
  },
};

export default function PlanejamentoProducao() {
  return <ResourcePage schema={schema} />;
}
