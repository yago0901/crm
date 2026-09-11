import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import {
  createWarehouse,
  getActiveWarehousesCount,
  mapWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../../../services/estoques-logistica/warehouses";
import { IWarehouse, WarehouseInput, WarehouseStatus } from "../../../types/warehouse";

const STATUS_LABEL: Record<WarehouseStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

const STATUS_TONE: Record<WarehouseStatus, "success" | "neutral"> = {
  ativo: "success",
  inativo: "neutral",
};

const EMPTY_FORM: WarehouseInput = {
  name: "",
  address: "",
  capacity: 0,
  manager: "",
  status: "ativo",
  notes: "",
};

const schema: ResourceSchema<IWarehouse, WarehouseInput> = {
  pageTitle: "Gestão de Armazéns",
  newLabel: "Novo armazém",
  entityLabel: "armazém",
  loadingMessage: "Carregando armazéns...",
  emptyMessage: "Nenhum armazém encontrado.",
  messages: {
    created: "Armazém cadastrado com sucesso.",
    updated: "Armazém atualizado com sucesso.",
    deleted: "Armazém excluído.",
  },

  collectionPath: "warehouses",
  mapDoc: mapWarehouse,
  filterOptions: [
    { value: "ativo", label: "Ativo" },
    { value: "inativo", label: "Inativo" },
  ],

  columns: [
    { key: "name", label: "Nome", render: (w) => w.name },
    { key: "address", label: "Endereço", render: (w) => w.address || "—" },
    { key: "capacity", label: "Capacidade", render: (w) => w.capacity },
    { key: "manager", label: "Responsável", render: (w) => w.manager || "—" },
    {
      key: "status",
      label: "Status",
      render: (w) => <Badge tone={STATUS_TONE[w.status]}>{STATUS_LABEL[w.status]}</Badge>,
    },
  ],

  fields: [
    { key: "name", label: "Nome", kind: "text", required: true },
    { key: "manager", label: "Responsável", kind: "text" },
    { key: "capacity", label: "Capacidade", kind: "number" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "ativo", label: "Ativo" },
        { value: "inativo", label: "Inativo" },
      ],
    },
    { key: "address", label: "Endereço", kind: "text", fullWidth: true },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (w) => ({
    name: w.name,
    address: w.address,
    capacity: w.capacity,
    manager: w.manager,
    status: w.status,
    notes: w.notes,
  }),
  getRowLabel: (w) => w.name,

  create: createWarehouse,
  update: updateWarehouse,
  remove: deleteWarehouse,

  summary: {
    label: "Armazéns ativos",
    fetch: getActiveWarehousesCount,
  },
};

export default function GestaoArmazens() {
  return <ResourcePage schema={schema} />;
}
