import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import { toDateInput } from "../../../utils/dateInput";
import {
  createShipment,
  deleteShipment,
  getInTransitShipmentsCount,
  mapShipment,
  updateShipment,
} from "../../../services/estoques-logistica/shipments";
import { IShipment, ShipmentInput, ShipmentStatus } from "../../../types/shipment";

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  preparando: "Preparando",
  em_transito: "Em trânsito",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<ShipmentStatus, "neutral" | "warning" | "success" | "danger"> = {
  preparando: "neutral",
  em_transito: "warning",
  entregue: "success",
  cancelado: "danger",
};

const EMPTY_FORM: ShipmentInput = {
  description: "",
  destination: "",
  carrier: "",
  trackingCode: "",
  status: "preparando",
  shipDate: null,
  notes: "",
};

const schema: ResourceSchema<IShipment, ShipmentInput> = {
  pageTitle: "Logística e Distribuição",
  newLabel: "Novo envio",
  entityLabel: "envio",
  loadingMessage: "Carregando envios...",
  emptyMessage: "Nenhum envio encontrado.",
  messages: {
    created: "Envio criado com sucesso.",
    updated: "Envio atualizado com sucesso.",
    deleted: "Envio excluído.",
  },

  collectionPath: "shipments",
  mapDoc: mapShipment,
  orderByField: "shipDate",
  orderDirection: "asc",
  filterOptions: [
    { value: "preparando", label: "Preparando" },
    { value: "em_transito", label: "Em trânsito" },
    { value: "entregue", label: "Entregue" },
    { value: "cancelado", label: "Cancelado" },
  ],

  columns: [
    { key: "description", label: "Descrição", render: (s) => s.description },
    { key: "destination", label: "Destino", render: (s) => s.destination },
    { key: "carrier", label: "Transportadora", render: (s) => s.carrier || "—" },
    { key: "shipDate", label: "Envio", render: (s) => toDateInput(s.shipDate) || "—" },
    {
      key: "status",
      label: "Status",
      render: (s) => <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>,
    },
  ],

  fields: [
    { key: "description", label: "Descrição", kind: "text", required: true },
    { key: "destination", label: "Destino", kind: "text", required: true },
    { key: "carrier", label: "Transportadora", kind: "text" },
    { key: "trackingCode", label: "Código de rastreio", kind: "text" },
    { key: "shipDate", label: "Data de envio", kind: "date" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "preparando", label: "Preparando" },
        { value: "em_transito", label: "Em trânsito" },
        { value: "entregue", label: "Entregue" },
        { value: "cancelado", label: "Cancelado" },
      ],
    },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (s) => ({
    description: s.description,
    destination: s.destination,
    carrier: s.carrier,
    trackingCode: s.trackingCode,
    status: s.status,
    shipDate: s.shipDate,
    notes: s.notes,
  }),
  getRowLabel: (s) => s.description,

  create: createShipment,
  update: updateShipment,
  remove: deleteShipment,

  summary: {
    label: "Em trânsito",
    fetch: getInTransitShipmentsCount,
  },
};

export default function LogisticaDistribuicao() {
  return <ResourcePage schema={schema} />;
}
