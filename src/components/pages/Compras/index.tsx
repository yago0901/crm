import { FormEvent, useEffect, useMemo, useState } from "react";
import { Timestamp, orderBy, where } from "firebase/firestore";
import { useAuth } from "../../../contexts/auth";
import { useToast } from "../../common/Toast";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Button from "../../common/Button";
import Badge from "../../common/Badge";
import FormField from "../../common/FormField";
import Pagination from "../../common/Pagination";
import { usePaginatedCollection } from "../../../hooks/usePaginatedCollection";
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  getPendingPurchaseOrdersTotal,
  mapPurchaseOrder,
  updatePurchaseOrder,
} from "../../../services/estoques-logistica/purchaseOrders";
import { fetchActiveSuppliers } from "../../../services/estoques-logistica/suppliers";
import { IPurchaseOrder, PurchaseOrderInput, PurchaseOrderStatus } from "../../../types/purchaseOrder";
import { ISupplier } from "../../../types/supplier";
import "./styles.scss";

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<PurchaseOrderStatus, "warning" | "info" | "success" | "danger"> = {
  pendente: "warning",
  aprovado: "info",
  recebido: "success",
  cancelado: "danger",
};

const EMPTY_FORM: PurchaseOrderInput = {
  supplierId: "",
  supplierName: "",
  description: "",
  value: 0,
  status: "pendente",
  orderDate: null,
  expectedDate: null,
  notes: "",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

const PAGE_SIZE = 10;

export default function Compras() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [totalPendente, setTotalPendente] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("orderDate", "desc")]
        : [where("status", "==", statusFilter), orderBy("orderDate", "desc")],
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
    collectionPath: "purchaseOrders",
    constraints,
    mapDoc: mapPurchaseOrder,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshTotal = () => {
    getPendingPurchaseOrdersTotal()
      .then(setTotalPendente)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshTotal();
  }, []);

  useEffect(() => {
    fetchActiveSuppliers()
      .then(setSuppliers)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PurchaseOrderInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState<IPurchaseOrder | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (order: IPurchaseOrder) => {
    setEditingId(order.id);
    setForm({
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      description: order.description,
      value: order.value,
      status: order.status,
      orderDate: order.orderDate,
      expectedDate: order.expectedDate,
      notes: order.notes,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    setForm({
      ...form,
      supplierId,
      supplierName: supplier?.name ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.supplierId) return;

    setSaving(true);
    try {
      if (editingId) {
        await updatePurchaseOrder(editingId, form);
        showToast("Pedido de compra atualizado.", "success");
      } else {
        await createPurchaseOrder(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Pedido de compra criado.", "success");
      }
      refresh();
      refreshTotal();
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

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      await deletePurchaseOrder(orderToDelete.id);
      showToast("Pedido de compra excluído.", "success");
      refresh();
      refreshTotal();
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
    <div className="purchases_page">
      <div className="purchases_page__header">
        <h1>Compras</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo pedido
        </Button>
      </div>

      <div className="purchases_page__summary">
        <span>Total pendente</span>
        <strong>{currency.format(totalPendente)}</strong>
      </div>

      <div className="purchases_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="recebido">Recebido</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="purchases_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="purchases_page__empty">Carregando pedidos...</p>
      ) : orders.length === 0 ? (
        <p className="purchases_page__empty">
          Nenhum pedido encontrado. Cadastre fornecedores ativos em Gestão de
          Fornecedores antes de criar um pedido.
        </p>
      ) : (
        <div className="purchases_page__table_wrap">
          <table className="purchases_page__table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Valor</th>
                <th>Pedido em</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.description}</td>
                  <td>{order.supplierName}</td>
                  <td>{currency.format(order.value)}</td>
                  <td>{toDateInput(order.orderDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[order.status]}>
                      {STATUS_LABEL[order.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="purchases_page__table__actions">
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
        title={editingId ? "Editar pedido de compra" : "Novo pedido de compra"}
      >
        <form className="purchases_page__form" onSubmit={handleSubmit}>
          <div className="purchases_page__form__grid">
            <FormField label="Fornecedor*">
              <select
                required
                value={form.supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
              >
                <option value="">Selecione o fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Descrição*">
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <FormField label="Valor (R$)*">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as PurchaseOrderStatus })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="recebido">Recebido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormField>
            <FormField label="Data do pedido">
              <input
                type="date"
                value={toDateInput(form.orderDate)}
                onChange={(e) =>
                  setForm({ ...form, orderDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Previsão de entrega">
              <input
                type="date"
                value={toDateInput(form.expectedDate)}
                onChange={(e) =>
                  setForm({ ...form, expectedDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="purchases_page__form__actions">
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
        isOpen={!!orderToDelete}
        title="Excluir pedido de compra"
        message={`Excluir "${orderToDelete?.description}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setOrderToDelete(null)}
      />
    </div>
  );
}
