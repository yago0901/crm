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
import { fetchActiveProducts } from "../../../services/shared/products";
import {
  createStockMovement,
  fetchMovementsForItem,
} from "../../../services/estoques-logistica/stockMovements";
import { IInventoryItem, InventoryItemStatus } from "../../../types/inventoryItem";
import { IProduct } from "../../../types/product";
import { IStockMovement, StockMovementType } from "../../../types/stockMovement";
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

interface EditableFields {
  quantity: number;
  minQuantity: number;
  unitCost: number;
  status: InventoryItemStatus;
  notes: string;
}

const EMPTY_FORM: EditableFields = {
  quantity: 0,
  minQuantity: 0,
  unitCost: 0,
  status: "ativo",
  notes: "",
};

const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  inventario: "Inventário (contagem)",
  perda: "Perda",
  devolucao: "Devolução",
};

const MOVEMENT_VALUE_LABEL: Record<StockMovementType, string> = {
  entrada: "Quantidade",
  saida: "Quantidade",
  perda: "Quantidade",
  devolucao: "Quantidade",
  ajuste: "Quantidade (negativo para diminuir)",
  inventario: "Quantidade contada agora",
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

  const [products, setProducts] = useState<IProduct[]>([]);

  const loadProducts = () => {
    fetchActiveProducts()
      .then(setProducts)
      .catch((err) =>
        showToast(err instanceof Error ? err.message : "Erro ao carregar produtos.", "error")
      );
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<IInventoryItem | null>(null);
  const [form, setForm] = useState<EditableFields>(EMPTY_FORM);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saving, setSaving] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<IInventoryItem | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSelectedProductId("");
    loadProducts();
    setIsFormOpen(true);
  };

  const openEditForm = (item: IInventoryItem) => {
    setEditingId(item.id);
    setEditingItem(item);
    setForm({
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      unitCost: item.unitCost,
      status: item.status,
      notes: item.notes ?? "",
    });
    setSelectedProductId(item.productId);
    loadProducts();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSelectedProductId("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    if (!selectedProductId) {
      showToast("Selecione ou cadastre um produto.", "error");
      return;
    }

    setSaving(true);
    try {
      const owner = { uid: currentUser.uid, name: currentUser.displayName ?? currentUser.email };

      const productData = products.find((p) => p.id === selectedProductId);
      if (!productData) {
        showToast("Produto não encontrado.", "error");
        setSaving(false);
        return;
      }

      const denormalized = {
        productId: productData.id,
        name: productData.name,
        sku: productData.sku,
        category: productData.category,
        unit: productData.unit,
      };

      if (editingId) {
        await updateInventoryItem(editingId, {
          ...denormalized,
          minQuantity: form.minQuantity,
          unitCost: form.unitCost,
          status: form.status,
          notes: form.notes,
        });
        showToast("Item atualizado com sucesso.", "success");
      } else {
        await createInventoryItem(
          {
            ...denormalized,
            quantity: form.quantity,
            minQuantity: form.minQuantity,
            unitCost: form.unitCost,
            status: form.status,
            notes: form.notes,
          },
          owner
        );
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

  const [movingItem, setMovingItem] = useState<IInventoryItem | null>(null);
  const [movementHistory, setMovementHistory] = useState<IStockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [movementType, setMovementType] = useState<StockMovementType>("entrada");
  const [movementValue, setMovementValue] = useState(0);
  const [movementNotes, setMovementNotes] = useState("");
  const [movementSaving, setMovementSaving] = useState(false);

  const loadHistory = (itemId: string) => {
    setHistoryLoading(true);
    fetchMovementsForItem(itemId)
      .then(setMovementHistory)
      .catch((err) =>
        showToast(err instanceof Error ? err.message : "Erro ao carregar histórico.", "error")
      )
      .finally(() => setHistoryLoading(false));
  };

  const openMovement = (item: IInventoryItem) => {
    setMovingItem(item);
    setMovementType("entrada");
    setMovementValue(0);
    setMovementNotes("");
    loadHistory(item.id);
  };

  const closeMovement = () => {
    setMovingItem(null);
    setMovementHistory([]);
  };

  const handleMovementSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!movingItem || !currentUser) return;

    setMovementSaving(true);
    try {
      await createStockMovement(
        { itemId: movingItem.id, type: movementType, value: movementValue, notes: movementNotes },
        { uid: currentUser.uid, name: currentUser.displayName ?? currentUser.email }
      );
      showToast("Movimentação registrada.", "success");
      setMovementValue(0);
      setMovementNotes("");
      loadHistory(movingItem.id);
      refresh();
      refreshActiveCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao registrar movimentação.",
        "error"
      );
    } finally {
      setMovementSaving(false);
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
                      <Button variant="secondary" onClick={() => openMovement(item)}>
                        Movimentar
                      </Button>
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
            <FormField label="Produto*">
              <select
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="" disabled>
                  Selecione um produto
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {product.sku ? ` (${product.sku})` : ""}
                  </option>
                ))}
              </select>
            </FormField>
            {editingId ? (
              <FormField label="Quantidade atual">
                <input value={`${editingItem?.quantity ?? 0} ${editingItem?.unit ?? ""}`} disabled />
              </FormField>
            ) : (
              <FormField label="Quantidade inicial*">
                <input
                  required
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </FormField>
            )}
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

          {products.length === 0 && (
            <p className="inventory_page__form__hint">
              Nenhum produto cadastrado ainda. Cadastre em Vendas / CRM → Produtos primeiro.
            </p>
          )}

          {editingId && (
            <p className="inventory_page__form__hint">
              Para mudar a quantidade, use o botão "Movimentar" na lista.
            </p>
          )}
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

      <Modal
        isOpen={!!movingItem}
        onClose={closeMovement}
        title={`Movimentar — ${movingItem?.name ?? ""}`}
      >
        <div className="inventory_page__movement">
          <p className="inventory_page__movement__balance">
            Saldo atual: <strong>{movingItem?.quantity} {movingItem?.unit}</strong>
          </p>

          <form className="inventory_page__movement__form" onSubmit={handleMovementSubmit}>
            <FormField label="Tipo">
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as StockMovementType)}
              >
                {Object.entries(MOVEMENT_TYPE_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={MOVEMENT_VALUE_LABEL[movementType]}>
              <input
                required
                type="number"
                min={movementType === "ajuste" ? undefined : 0}
                value={movementValue}
                onChange={(e) => setMovementValue(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Observações">
              <input
                value={movementNotes}
                onChange={(e) => setMovementNotes(e.target.value)}
              />
            </FormField>
            <Button type="submit" variant="primary" disabled={movementSaving}>
              {movementSaving ? "Registrando..." : "Registrar movimentação"}
            </Button>
          </form>

          <div className="inventory_page__movement__history">
            <span className="inventory_page__movement__history__label">Histórico</span>
            {historyLoading ? (
              <p className="inventory_page__empty">Carregando...</p>
            ) : movementHistory.length === 0 ? (
              <p className="inventory_page__empty">Nenhuma movimentação registrada ainda.</p>
            ) : (
              <ul>
                {movementHistory.map((movement) => (
                  <li key={movement.id}>
                    <strong>{MOVEMENT_TYPE_LABEL[movement.type]}</strong>{" "}
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity} — saldo ficou {movement.balanceAfter}
                    {movement.notes && <span> ({movement.notes})</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
