import { FormEvent, useMemo, useState } from "react";
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
  createProduct,
  deleteProduct,
  mapProduct,
  updateProduct,
} from "../../../services/shared/products";
import { IProduct, ProductInput, ProductStatus } from "../../../types/product";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<ProductStatus, string> = {
  ativo: "Ativo",
  descontinuado: "Descontinuado",
};

const STATUS_TONE: Record<ProductStatus, "success" | "neutral"> = {
  ativo: "success",
  descontinuado: "neutral",
};

const EMPTY_FORM: ProductInput = {
  name: "",
  sku: "",
  category: "",
  unit: "un",
  salePrice: 0,
  status: "ativo",
  notes: "",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function Produtos() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: products,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "products",
    constraints,
    mapDoc: mapProduct,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [productToDelete, setProductToDelete] = useState<IProduct | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (product: IProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      salePrice: product.salePrice,
      status: product.status,
      notes: product.notes,
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
        await updateProduct(editingId, form);
        showToast("Produto atualizado com sucesso.", "success");
      } else {
        await createProduct(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Produto cadastrado com sucesso.", "success");
      }
      refresh();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar produto",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      showToast("Produto excluído.", "success");
      refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir produto",
        "error"
      );
    } finally {
      setProductToDelete(null);
    }
  };

  return (
    <div className="products_page">
      <div className="products_page__header">
        <h1>Produtos</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo produto
        </Button>
      </div>

      <div className="products_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProductStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="descontinuado">Descontinuado</option>
        </select>
      </div>

      {pageError && <p className="products_page__error">{pageError}</p>}

      {loading ? (
        <p className="products_page__empty">Carregando produtos...</p>
      ) : products.length === 0 ? (
        <p className="products_page__empty">Nenhum produto encontrado.</p>
      ) : (
        <div className="products_page__table_wrap">
          <table className="products_page__table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Preço de venda</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.sku || "—"}</td>
                  <td>{product.category || "—"}</td>
                  <td>{product.unit}</td>
                  <td>{currency.format(product.salePrice)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[product.status]}>
                      {STATUS_LABEL[product.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="products_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(product)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setProductToDelete(product)}>
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
        title={editingId ? "Editar produto" : "Novo produto"}
      >
        <form className="products_page__form" onSubmit={handleSubmit}>
          <div className="products_page__form__grid">
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
            <FormField label="Preço de venda (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}
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
          <div className="products_page__form__actions">
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
        isOpen={!!productToDelete}
        title="Excluir produto"
        message={`Excluir "${productToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
