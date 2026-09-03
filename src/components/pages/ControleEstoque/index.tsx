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
  createInventoryItem,
  deleteInventoryItem,
  getActiveInventoryTotal,
  mapInventoryItem,
  updateInventoryItem,
} from "../../../services/estoques-logistica/inventory";
import { IInventoryItem, InventoryItemInput, InventoryItemStatus } from "../../../types/inventoryItem";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<InventoryItemStatus, string> = {
  ativo: "Ativo",
  descontinuado: "Descontinuado",
};

const STATUS_TONE: Record<InventoryItemStatus, "success" | "neutral"> = {
  ativo: "success",
  descontinuado: "neutral",
};

const EMPTY_FORM: InventoryItemInput = {
  name: "",
  sku: "",
  category: "",
  quantity: 0,
  minQuantity: 0,
  unit: "un",
  unitCost: 0,
  status: "ativo",
  notes: "",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function ControleEstoque() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeCount, setActiveCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<InventoryItemStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "inventoryItems",
    constraints,
    mapDoc: mapInventoryItem,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshActiveCount = () => {
    getActiveInventoryTotal()
      .then(setActiveCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshActiveCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryItemInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<IInventoryItem | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (item: IInventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      unit: item.unit,
      unitCost: item.unitCost,
      status: item.status,
      notes: item.notes,
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
        await updateInventoryItem(editingId, form);
        showToast("Item atualizado com sucesso.", "success");
      } else {
        await createInventoryItem(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Item cadastrado com sucesso.", "success");
      }
      refresh();
      refreshActiveCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar item",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteInventoryItem(itemToDelete.id);
      showToast("Item excluído.", "success");
      refresh();
      refreshActiveCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir item",
        "error"
      );
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="inventory_page">
      <div className="inventory_page__header">
        <h1>Controle de Estoque</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo item
        </Button>
      </div>

      <div className="inventory_page__summary">
        <span>Itens ativos</span>
        <strong>{activeCount}</strong>
      </div>

      <div className="inventory_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InventoryItemStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="descontinuado">Descontinuado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="inventory_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="inventory_page__empty">Carregando estoque...</p>
      ) : items.length === 0 ? (
        <p className="inventory_page__empty">Nenhum item encontrado.</p>
      ) : (
        <div className="inventory_page__table_wrap">
          <table className="inventory_page__table">
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Custo unit.</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.sku || "—"}</td>
                  <td>{item.category || "—"}</td>
                  <td>
                    {item.quantity} {item.unit}
                    {item.quantity <= item.minQuantity && (
                      <Badge tone="danger">Estoque baixo</Badge>
                    )}
                  </td>
                  <td>{currency.format(item.unitCost)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="inventory_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(item)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setItemToDelete(item)}>
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
        title={editingId ? "Editar item" : "Novo item"}
      >
        <form className="inventory_page__form" onSubmit={handleSubmit}>
          <div className="inventory_page__form__grid">
            <FormField label="Nome*">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="SKU">
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </FormField>
            <FormField label="Categoria">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </FormField>
            <FormField label="Unidade">
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
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
            <FormField label="Quantidade mínima">
              <input
                type="number"
                min="0"
                value={form.minQuantity}
                onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Custo unitário (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as InventoryItemStatus })
                }
              >
                <option value="ativo">Ativo</option>
                <option value="descontinuado">Descontinuado</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="inventory_page__form__actions">
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
        isOpen={!!itemToDelete}
        title="Excluir item"
        message={`Excluir "${itemToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
