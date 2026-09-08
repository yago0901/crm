import { FormEvent, useEffect, useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
import { useAuth } from "../../../contexts/auth/AuthContext";
import { useToast } from "../../common/Toast/ToastContext";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Button from "../../common/Button";
import Badge from "../../common/Badge";
import FormField from "../../common/FormField";
import Pagination from "../../common/Pagination";
import { usePaginatedCollection } from "../../../hooks/usePaginatedCollection";
import {
  approveSalesOrder,
  createSalesOrder,
  deleteSalesOrder,
  mapSalesOrder,
  updateSalesOrder,
} from "../../../services/vendas-crm/salesOrders";
import { fetchOpenContacts } from "../../../services/vendas-crm/contacts";
import { fetchAcceptedProposals } from "../../../services/vendas-crm/proposals";
import { fetchActiveProducts } from "../../../services/shared/products";
import { fetchActiveWarehouses } from "../../../services/estoques-logistica/warehouses";
import {
  ISalesOrder,
  ISalesOrderItem,
  SalesOrderInput,
  SalesOrderStatus,
} from "../../../types/salesOrder";
import { IContact } from "../../../types/contact";
import { IProposal } from "../../../types/proposal";
import { IProduct } from "../../../types/product";
import { IWarehouse } from "../../../types/warehouse";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<SalesOrderStatus, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<SalesOrderStatus, "neutral" | "success" | "danger"> = {
  rascunho: "neutral",
  aprovado: "success",
  cancelado: "danger",
};

const EDITABLE_STATUSES: { value: SalesOrderStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "cancelado", label: "Cancelado" },
];

const EMPTY_FORM: SalesOrderInput = {
  contactId: "",
  contactName: "",
  proposalId: "",
  dealId: "",
  warehouseId: "",
  warehouseName: "",
  items: [],
  total: 0,
  status: "rascunho",
  notes: "",
};

const EMPTY_ITEM_DRAFT = { productId: "", quantity: 1, unitPrice: 0, discountPercent: 0 };

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const lineSubtotal = (item: ISalesOrderItem): number =>
  item.quantity * item.unitPrice * (1 - item.discountPercent / 100);

const computeTotal = (items: ISalesOrderItem[]): number =>
  items.reduce((sum, item) => sum + lineSubtotal(item), 0);

export default function PedidosDeVenda() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<IContact[]>([]);
  const [proposals, setProposals] = useState<IProposal[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<SalesOrderStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: orders,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "salesOrders",
    constraints,
    mapDoc: mapSalesOrder,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  useEffect(() => {
    fetchOpenContacts()
      .then(setContacts)
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    fetchAcceptedProposals()
      .then(setProposals)
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    fetchActiveProducts()
      .then(setProducts)
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    fetchActiveWarehouses()
      .then(setWarehouses)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<SalesOrderStatus | null>(null);
  const [form, setForm] = useState<SalesOrderInput>(EMPTY_FORM);
  const [itemDraft, setItemDraft] = useState(EMPTY_ITEM_DRAFT);
  const [saving, setSaving] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState<ISalesOrder | null>(null);
  const [orderToApprove, setOrderToApprove] = useState<ISalesOrder | null>(null);
  const [approving, setApproving] = useState(false);

  const openCreateForm = () => {
    setEditingId(null);
    setEditingStatus(null);
    setForm(EMPTY_FORM);
    setItemDraft(EMPTY_ITEM_DRAFT);
    setIsFormOpen(true);
  };

  const openEditForm = (order: ISalesOrder) => {
    setEditingId(order.id);
    setEditingStatus(order.status);
    setForm({
      contactId: order.contactId,
      contactName: order.contactName,
      proposalId: order.proposalId ?? "",
      dealId: order.dealId ?? "",
      warehouseId: order.warehouseId ?? "",
      warehouseName: order.warehouseName ?? "",
      items: order.items,
      total: order.total,
      status: order.status,
      notes: order.notes,
    });
    setItemDraft(EMPTY_ITEM_DRAFT);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setEditingStatus(null);
    setForm(EMPTY_FORM);
    setItemDraft(EMPTY_ITEM_DRAFT);
  };

  const handleContactChange = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    setForm({ ...form, contactId, contactName: contact?.name ?? "" });
  };

  const handleWarehouseChange = (warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    setForm({ ...form, warehouseId, warehouseName: warehouse?.name ?? "" });
  };

  const handleProposalChange = (proposalId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) {
      setForm({ ...form, proposalId: "" });
      return;
    }
    const items: ISalesOrderItem[] = proposal.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: 0,
    }));
    setForm({
      ...form,
      proposalId,
      dealId: proposal.dealId ?? "",
      contactId: proposal.contactId,
      contactName: proposal.contactName,
      items,
      total: computeTotal(items),
    });
  };

  const handleItemProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItemDraft({ ...itemDraft, productId, unitPrice: product?.salePrice ?? 0 });
  };

  const handleAddItem = () => {
    const product = products.find((p) => p.id === itemDraft.productId);
    if (!product || itemDraft.quantity <= 0) return;

    const newItem: ISalesOrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: itemDraft.quantity,
      unitPrice: itemDraft.unitPrice,
      discountPercent: itemDraft.discountPercent,
    };
    const items = [...form.items, newItem];
    setForm({ ...form, items, total: computeTotal(items) });
    setItemDraft(EMPTY_ITEM_DRAFT);
  };

  const handleRemoveItem = (index: number) => {
    const items = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items, total: computeTotal(items) });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.contactId) return;
    if (form.items.length === 0) {
      showToast("Adicione ao menos um item ao pedido.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateSalesOrder(editingId, form);
        showToast("Pedido atualizado com sucesso.", "success");
      } else {
        await createSalesOrder(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Pedido criado com sucesso.", "success");
      }
      refresh();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar pedido",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!orderToApprove || !currentUser) return;
    setApproving(true);
    try {
      await approveSalesOrder(orderToApprove.id, {
        uid: currentUser.uid,
        name: currentUser.displayName ?? currentUser.email,
      });
      showToast("Pedido aprovado: estoque baixado e conta a receber gerada.", "success");
      refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao aprovar pedido",
        "error"
      );
    } finally {
      setApproving(false);
      setOrderToApprove(null);
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      await deleteSalesOrder(orderToDelete.id);
      showToast("Pedido excluído.", "success");
      refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir pedido",
        "error"
      );
    } finally {
      setOrderToDelete(null);
    }
  };

  return (
    <div className="sales_orders_page">
      <div className="sales_orders_page__header">
        <h1>Pedidos de Venda</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo pedido
        </Button>
      </div>

      <div className="sales_orders_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SalesOrderStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="aprovado">Aprovado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="sales_orders_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="sales_orders_page__empty">Carregando pedidos...</p>
      ) : orders.length === 0 ? (
        <p className="sales_orders_page__empty">
          Nenhum pedido encontrado. Cadastre contatos em Gestão de Contatos antes de criar um
          pedido.
        </p>
      ) : (
        <div className="sales_orders_page__table_wrap">
          <table className="sales_orders_page__table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.contactName}</td>
                  <td>{order.items.length}</td>
                  <td>{currency.format(order.total)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                  </td>
                  <td>
                    <div className="sales_orders_page__table__actions">
                      {order.status === "rascunho" && (
                        <Button variant="primary" onClick={() => setOrderToApprove(order)}>
                          Aprovar
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => openEditForm(order)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setOrderToDelete(order)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingId ? "Editar pedido" : "Novo pedido"}
      >
        <form className="sales_orders_page__form" onSubmit={handleSubmit}>
          <div className="sales_orders_page__form__grid">
            {!editingId && (
              <FormField label="Proposta vinculada (opcional)">
                <select value={form.proposalId} onChange={(e) => handleProposalChange(e.target.value)}>
                  <option value="">Nenhuma (preencher manualmente)</option>
                  {proposals.map((proposal) => (
                    <option key={proposal.id} value={proposal.id}>
                      {proposal.contactName} — {currency.format(proposal.total)}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <FormField label="Cliente*">
              <select
                required
                value={form.contactId}
                disabled={editingStatus === "aprovado"}
                onChange={(e) => handleContactChange(e.target.value)}
              >
                <option value="">Selecione o cliente</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Armazém (opcional)">
              <select
                value={form.warehouseId}
                disabled={editingStatus === "aprovado"}
                onChange={(e) => handleWarehouseChange(e.target.value)}
              >
                <option value="">Nenhum</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              {editingStatus === "aprovado" ? (
                <input value="Aprovado" disabled />
              ) : (
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as SalesOrderStatus })}
                >
                  {EDITABLE_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>

          <div className="sales_orders_page__items">
            <span className="sales_orders_page__items__label">Itens*</span>

            {form.items.length > 0 && (
              <table className="sales_orders_page__items__table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Preço unit.</th>
                    <th>Desconto</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={`${item.productId}-${index}`}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{currency.format(item.unitPrice)}</td>
                      <td>{item.discountPercent}%</td>
                      <td>{currency.format(lineSubtotal(item))}</td>
                      <td>
                        {editingStatus !== "aprovado" && (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => handleRemoveItem(index)}
                          >
                            Remover
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {editingStatus !== "aprovado" && (
              <div className="sales_orders_page__items__add">
                <select
                  value={itemDraft.productId}
                  onChange={(e) => handleItemProductChange(e.target.value)}
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={itemDraft.quantity}
                  onChange={(e) => setItemDraft({ ...itemDraft, quantity: Number(e.target.value) })}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDraft.unitPrice}
                  onChange={(e) => setItemDraft({ ...itemDraft, unitPrice: Number(e.target.value) })}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={itemDraft.discountPercent}
                  onChange={(e) =>
                    setItemDraft({ ...itemDraft, discountPercent: Number(e.target.value) })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddItem}
                  disabled={!itemDraft.productId}
                >
                  + Adicionar item
                </Button>
              </div>
            )}

            <p className="sales_orders_page__items__total">
              Total: <strong>{currency.format(form.total)}</strong>
            </p>
          </div>

          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="sales_orders_page__form__actions">
            <Button type="button" variant="secondary" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!orderToApprove}
        title="Aprovar pedido de venda"
        message={`Confirmar aprovação do pedido de "${orderToApprove?.contactName}"? Isso vai dar baixa no estoque de cada item vinculado e gerar uma conta a receber de ${currency.format(orderToApprove?.total ?? 0)}.`}
        confirmLabel={approving ? "Aprovando..." : "Confirmar aprovação"}
        onConfirm={handleApprove}
        onCancel={() => setOrderToApprove(null)}
      />

      <ConfirmDialog
        isOpen={!!orderToDelete}
        title="Excluir pedido"
        message={`Excluir o pedido de "${orderToDelete?.contactName}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setOrderToDelete(null)}
      />
    </div>
  );
}
