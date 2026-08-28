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
  createProductionOrder,
  deleteProductionOrder,
  getPendingProductionOrdersCount,
  mapProductionOrder,
  updateProductionOrder,
} from "../../../services/producao-manufatura/productionOrders";
import { IProductionOrder, ProductionOrderInput, ProductionOrderStatus } from "../../../types/productionOrder";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

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

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function OrdensProducao() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [pendingCount, setPendingCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProductionOrderStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("dueDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("dueDate", "asc")],
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
    collectionPath: "productionOrders",
    constraints,
    mapDoc: mapProductionOrder,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshPendingCount = () => {
    getPendingProductionOrdersCount()
      .then(setPendingCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshPendingCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductionOrderInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState<IProductionOrder | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (order: IProductionOrder) => {
    setEditingId(order.id);
    setForm({
      description: order.description,
      productName: order.productName,
      quantity: order.quantity,
      status: order.status,
      dueDate: order.dueDate,
      notes: order.notes,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateProductionOrder(editingId, form);
        showToast("Ordem de produção atualizada.", "success");
      } else {
        await createProductionOrder(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Ordem de produção criada.", "success");
      }
      refresh();
      refreshPendingCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar ordem",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      await deleteProductionOrder(orderToDelete.id);
      showToast("Ordem de produção excluída.", "success");
      refresh();
      refreshPendingCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir ordem",
        "error"
      );
    } finally {
      setOrderToDelete(null);
    }
  };

  return (
    <div className="production_orders_page">
      <div className="production_orders_page__header">
        <h1>Ordens de Produção</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova ordem
        </Button>
      </div>

      <div className="production_orders_page__summary">
        <span>Pendentes</span>
        <strong>{pendingCount}</strong>
      </div>

      <div className="production_orders_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProductionOrderStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_producao">Em produção</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="production_orders_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="production_orders_page__empty">Carregando ordens...</p>
      ) : orders.length === 0 ? (
        <p className="production_orders_page__empty">Nenhuma ordem de produção encontrada.</p>
      ) : (
        <div className="production_orders_page__table_wrap">
          <table className="production_orders_page__table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Prazo</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.description}</td>
                  <td>{order.productName}</td>
                  <td>{order.quantity}</td>
                  <td>{toDateInput(order.dueDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[order.status]}>
                      {STATUS_LABEL[order.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="production_orders_page__table__actions">
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
        title={editingId ? "Editar ordem de produção" : "Nova ordem de produção"}
      >
        <form className="production_orders_page__form" onSubmit={handleSubmit}>
          <div className="production_orders_page__form__grid">
            <FormField label="Descrição*">
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <FormField label="Produto*">
              <input
                required
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </FormField>
            <FormField label="Quantidade*">
              <input
                required
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Prazo">
              <input
                type="date"
                value={toDateInput(form.dueDate)}
                onChange={(e) => setForm({ ...form, dueDate: fromDateInput(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProductionOrderStatus })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="em_producao">Em produção</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="production_orders_page__form__actions">
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
        title="Excluir ordem de produção"
        message={`Excluir "${orderToDelete?.description}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setOrderToDelete(null)}
      />
    </div>
  );
}
