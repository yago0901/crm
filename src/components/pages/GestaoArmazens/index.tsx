import { FormEvent, useEffect, useMemo, useState } from "react";
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
  createWarehouse,
  deleteWarehouse,
  getActiveWarehousesCount,
  mapWarehouse,
  updateWarehouse,
} from "../../../services/estoques-logistica/warehouses";
import { IWarehouse, WarehouseInput, WarehouseStatus } from "../../../types/warehouse";
import "./styles.scss";

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

const PAGE_SIZE = 10;

export default function GestaoArmazens() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeCount, setActiveCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<WarehouseStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: warehouses,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "warehouses",
    constraints,
    mapDoc: mapWarehouse,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshActiveCount = () => {
    getActiveWarehousesCount()
      .then(setActiveCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshActiveCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WarehouseInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [warehouseToDelete, setWarehouseToDelete] = useState<IWarehouse | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (warehouse: IWarehouse) => {
    setEditingId(warehouse.id);
    setForm({
      name: warehouse.name,
      address: warehouse.address,
      capacity: warehouse.capacity,
      manager: warehouse.manager,
      status: warehouse.status,
      notes: warehouse.notes,
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
        await updateWarehouse(editingId, form);
        showToast("Armazém atualizado com sucesso.", "success");
      } else {
        await createWarehouse(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Armazém cadastrado com sucesso.", "success");
      }
      refresh();
      refreshActiveCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar armazém",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!warehouseToDelete) return;
    try {
      await deleteWarehouse(warehouseToDelete.id);
      showToast("Armazém excluído.", "success");
      refresh();
      refreshActiveCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir armazém",
        "error"
      );
    } finally {
      setWarehouseToDelete(null);
    }
  };

  return (
    <div className="warehouses_page">
      <div className="warehouses_page__header">
        <h1>Gestão de Armazéns</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo armazém
        </Button>
      </div>

      <div className="warehouses_page__summary">
        <span>Armazéns ativos</span>
        <strong>{activeCount}</strong>
      </div>

      <div className="warehouses_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as WarehouseStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="warehouses_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="warehouses_page__empty">Carregando armazéns...</p>
      ) : warehouses.length === 0 ? (
        <p className="warehouses_page__empty">Nenhum armazém encontrado.</p>
      ) : (
        <div className="warehouses_page__table_wrap">
          <table className="warehouses_page__table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Endereço</th>
                <th>Capacidade</th>
                <th>Responsável</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td>{warehouse.name}</td>
                  <td>{warehouse.address || "—"}</td>
                  <td>{warehouse.capacity}</td>
                  <td>{warehouse.manager || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[warehouse.status]}>
                      {STATUS_LABEL[warehouse.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="warehouses_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(warehouse)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setWarehouseToDelete(warehouse)}>
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
        title={editingId ? "Editar armazém" : "Novo armazém"}
      >
        <form className="warehouses_page__form" onSubmit={handleSubmit}>
          <div className="warehouses_page__form__grid">
            <FormField label="Nome*">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Responsável">
              <input
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
              />
            </FormField>
            <FormField label="Capacidade">
              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as WarehouseStatus })
                }
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </FormField>
          </div>
          <FormField label="Endereço">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </FormField>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="warehouses_page__form__actions">
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
        isOpen={!!warehouseToDelete}
        title="Excluir armazém"
        message={`Excluir "${warehouseToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setWarehouseToDelete(null)}
      />
    </div>
  );
}
