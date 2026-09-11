import Badge from "../../common/Badge";
import ResourcePage from "../../common/ResourcePage";
import { ResourceSchema } from "../../common/ResourcePage/types";
import {
  createSupplier,
  deleteSupplier,
  mapSupplier,
  updateSupplier,
} from "../../../services/estoques-logistica/suppliers";
import { ISupplier, SupplierInput, SupplierStatus } from "../../../types/supplier";

const STATUS_LABEL: Record<SupplierStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

const STATUS_TONE: Record<SupplierStatus, "success" | "neutral"> = {
  ativo: "success",
  inativo: "neutral",
};

const EMPTY_FORM: SupplierInput = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  category: "",
  status: "ativo",
  notes: "",
};

const schema: ResourceSchema<ISupplier, SupplierInput> = {
  pageTitle: "Gestão de Fornecedores",
  newLabel: "Novo fornecedor",
  entityLabel: "fornecedor",
  loadingMessage: "Carregando fornecedores...",
  emptyMessage: "Nenhum fornecedor encontrado.",
  messages: {
    created: "Fornecedor cadastrado com sucesso.",
    updated: "Fornecedor atualizado com sucesso.",
    deleted: "Fornecedor excluído.",
  },

  collectionPath: "suppliers",
  mapDoc: mapSupplier,
  filterOptions: [
    { value: "ativo", label: "Ativo" },
    { value: "inativo", label: "Inativo" },
  ],

  columns: [
    { key: "name", label: "Nome", render: (s) => s.name },
    { key: "category", label: "Categoria", render: (s) => s.category || "—" },
    { key: "contact", label: "Contato", render: (s) => s.email || s.phone || "—" },
    {
      key: "status",
      label: "Status",
      render: (s) => <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>,
    },
  ],

  fields: [
    { key: "name", label: "Nome", kind: "text", required: true },
    { key: "category", label: "Categoria", kind: "text" },
    { key: "contactName", label: "Contato", kind: "text" },
    { key: "email", label: "E-mail", kind: "email" },
    { key: "phone", label: "Telefone", kind: "text" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { value: "ativo", label: "Ativo" },
        { value: "inativo", label: "Inativo" },
      ],
    },
    { key: "notes", label: "Observações", kind: "textarea", fullWidth: true },
  ],

  emptyForm: EMPTY_FORM,
  toInput: (s) => ({
    name: s.name,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    category: s.category,
    status: s.status,
    notes: s.notes,
  }),
  getRowLabel: (s) => s.name,

  create: createSupplier,
  update: updateSupplier,
  remove: deleteSupplier,
};

export default function GestaoFornecedores() {
  return <ResourcePage schema={schema} />;
}
