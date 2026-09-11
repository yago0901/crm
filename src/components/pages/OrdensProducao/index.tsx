import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import {
  createProductionOrder,
  deleteProductionOrder,
  getPendingProductionOrdersCount,
  mapProductionOrder,
  updateProductionOrder,
} from "../../../services/producao-manufatura/productionOrders";
import { IProductionOrder, ProductionOrderInput, ProductionOrderStatus } from "../../../types/productionOrder";

const STATUS_LABEL: Record<ProductionOrderStatus, string> = {
  pendente: "Pendente",
  em_producao: "Em produção",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_TONE: Record<ProductionOrderStatus, "warning" | "info" | "success" | "danger"> = {
  pendente: "warning",
  em_producao: "info",
  concluida: "success",
  cancelada: "danger",
};

const EMPTY_FORM: ProductionOrderInput = {
  description: "",
  productName: "",
  quantity: 0,
  status: "pendente",
  dueDate: null,
  notes: "",
};

const schema: ResourceSchema<IProductionOrder, ProductionOrderInput> = {
  pageTitle: "Ordens de Produção",
  newLabel: "Nova ordem de produção",
  entityLabel: "ordem de produção",
  loadingMessage: "Carregando ordens...",
  emptyMessage: "Nenhuma ordem de produção encontrada.",
  messages: {
    created: "Ordem de produção criada.",
    updated: "Ordem de produção atualizada.",
    deleted: "Ordem de produção excluída.",
  },

  collectionPath: "productionOrders",
  mapDoc: mapProductionOrder,
  orderByField: "dueDate",
  orderDirection: "asc",
  filterOptions: [
    { value: "pendente", label: "Pendente" },
    { value: "em_producao", label: "Em produção" },
    { value: "concluida", label: "Concluída" },
    { value: "cancelada", label: "Cancelada" },
  ],

  columns: [
    { key: "description", label: "Descrição", render: (o) => o.description },
    { key: "productName", label: "Produto", render: (o) => o.productName },
    { key: "quantity", label: "Quantidade", render: (o) => o.quantity },
    { key: "dueDate", label: "Prazo", render: (o) => toDateInput(o.dueDate) || "—" },
    {
      key: "status",
      label: "Status",
      render: (o) => <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>,
    },
  ],

  fields: [
    { key: "description", label: "Descrição", kind: "text", required: true },
    { key: "productName", label: "Produto", kind: "text", required: true },
    { key: "quantity", label: "Quantidade", kind: "number", required: true },
    { key: "dueDate", label: "Prazo", kind: "date" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "pendente", label: "Pendente" },
        { value: "em_producao", label: "Em produção" },
        { value: "concluida", label: "Concluída" },
        { value: "cancelada", label: "Cancelada" },
      ],
    },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (o) => ({
    description: o.description,
    productName: o.productName,
    quantity: o.quantity,
    status: o.status,
    dueDate: o.dueDate,
    notes: o.notes,
  }),
  getRowLabel: (o) => o.description,

  create: createProductionOrder,
  update: updateProductionOrder,
  remove: deleteProductionOrder,

  summary: {
    label: "Pendentes",
    fetch: getPendingProductionOrdersCount,
  },
};

export default function OrdensProducao() {
  return <ResourcePage schema={schema} />;
}
