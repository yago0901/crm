import { FormEvent, useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
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
  createSupplier,
  deleteSupplier,
  mapSupplier,
  updateSupplier,
} from "../../../services/suppliers";
import { ISupplier, SupplierInput, SupplierStatus } from "../../../types/supplier";
import "./styles.scss";

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

const PAGE_SIZE = 10;

export default function GestaoFornecedores() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<SupplierStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: suppliers,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "suppliers",
    constraints,
    mapDoc: mapSupplier,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [supplierToDelete, setSupplierToDelete] = useState<ISupplier | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (supplier: ISupplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      category: supplier.category,
      status: supplier.status,
      notes: supplier.notes,
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
        await updateSupplier(editingId, form);
        showToast("Fornecedor atualizado com sucesso.", "success");
      } else {
        await createSupplier(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Fornecedor cadastrado com sucesso.", "success");
      }
      refresh();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar fornecedor",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplier(supplierToDelete.id);
      showToast("Fornecedor excluído.", "success");
      refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir fornecedor",
        "error"
      );
    } finally {
      setSupplierToDelete(null);
    }
  };

  return (
    <div className="suppliers_page">
      <div className="suppliers_page__header">
        <h1>Gestão de Fornecedores</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo fornecedor
        </Button>
      </div>

      <div className="suppliers_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SupplierStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {pageError && <p className="suppliers_page__error">{pageError}</p>}

      {loading ? (
        <p className="suppliers_page__empty">Carregando fornecedores...</p>
      ) : suppliers.length === 0 ? (
        <p className="suppliers_page__empty">Nenhum fornecedor encontrado.</p>
      ) : (
        <div className="suppliers_page__table_wrap">
          <table className="suppliers_page__table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Contato</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.category || "—"}</td>
                  <td>{supplier.email || supplier.phone || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[supplier.status]}>
                      {STATUS_LABEL[supplier.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="suppliers_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(supplier)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setSupplierToDelete(supplier)}>
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
        title={editingId ? "Editar fornecedor" : "Novo fornecedor"}
      >
        <form className="suppliers_page__form" onSubmit={handleSubmit}>
          <div className="suppliers_page__form__grid">
            <FormField label="Nome*">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Categoria">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </FormField>
            <FormField label="Contato">
              <input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </FormField>
            <FormField label="E-mail">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
            <FormField label="Telefone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as SupplierStatus })
                }
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="suppliers_page__form__actions">
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
        isOpen={!!supplierToDelete}
        title="Excluir fornecedor"
        message={`Excluir "${supplierToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setSupplierToDelete(null)}
      />
    </div>
  );
}
