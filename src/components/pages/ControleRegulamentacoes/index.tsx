import { FormEvent, useEffect, useMemo, useState } from "react";
import { Timestamp, orderBy, where } from "firebase/firestore";
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
  createRegulation,
  deleteRegulation,
  getOverdueRegulationsCount,
  mapRegulation,
  updateRegulation,
} from "../../../services/compliance/regulations";
import { IRegulation, RegulationInput, RegulationStatus } from "../../../types/regulation";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<RegulationStatus, string> = {
  pendente: "Pendente",
  atendido: "Atendido",
  vencido: "Vencido",
};

const STATUS_TONE: Record<RegulationStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  atendido: "success",
  vencido: "danger",
};

const EMPTY_FORM: RegulationInput = {
  name: "",
  category: "",
  responsible: "",
  deadline: null,
  status: "pendente",
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function ControleRegulamentacoes() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [overdueCount, setOverdueCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<RegulationStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("deadline", "asc")]
        : [where("status", "==", statusFilter), orderBy("deadline", "asc")],
    [statusFilter]
  );

  const {
    items: regulations,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "regulations",
    constraints,
    mapDoc: mapRegulation,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshOverdueCount = () => {
    getOverdueRegulationsCount()
      .then(setOverdueCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshOverdueCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RegulationInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [regulationToDelete, setRegulationToDelete] = useState<IRegulation | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (regulation: IRegulation) => {
    setEditingId(regulation.id);
    setForm({
      name: regulation.name,
      category: regulation.category,
      responsible: regulation.responsible,
      deadline: regulation.deadline,
      status: regulation.status,
      notes: regulation.notes,
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
        await updateRegulation(editingId, form);
        showToast("Regulamentação atualizada com sucesso.", "success");
      } else {
        await createRegulation(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Regulamentação criada com sucesso.", "success");
      }
      refresh();
      refreshOverdueCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar regulamentação",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!regulationToDelete) return;
    try {
      await deleteRegulation(regulationToDelete.id);
      showToast("Regulamentação excluída.", "success");
      refresh();
      refreshOverdueCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir regulamentação",
        "error"
      );
    } finally {
      setRegulationToDelete(null);
    }
  };

  return (
    <div className="regulations_page">
      <div className="regulations_page__header">
        <h1>Controle de Regulamentações</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova regulamentação
        </Button>
      </div>

      <div
        className={`regulations_page__summary ${
          overdueCount > 0
            ? "regulations_page__summary--danger"
            : "regulations_page__summary--success"
        }`}
      >
        <span>Vencidas</span>
        <strong>{overdueCount}</strong>
      </div>

      <div className="regulations_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RegulationStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="atendido">Atendido</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="regulations_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="regulations_page__empty">Carregando regulamentações...</p>
      ) : regulations.length === 0 ? (
        <p className="regulations_page__empty">Nenhuma regulamentação encontrada.</p>
      ) : (
        <div className="regulations_page__table_wrap">
          <table className="regulations_page__table">
            <thead>
              <tr>
                <th>Regulamentação</th>
                <th>Categoria</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {regulations.map((regulation) => (
                <tr key={regulation.id}>
                  <td>{regulation.name}</td>
                  <td>{regulation.category || "—"}</td>
                  <td>{regulation.responsible || "—"}</td>
                  <td>{toDateInput(regulation.deadline) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[regulation.status]}>
                      {STATUS_LABEL[regulation.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="regulations_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(regulation)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setRegulationToDelete(regulation)}>
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
        title={editingId ? "Editar regulamentação" : "Nova regulamentação"}
      >
        <form className="regulations_page__form" onSubmit={handleSubmit}>
          <div className="regulations_page__form__grid">
            <FormField label="Regulamentação*">
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
            <FormField label="Responsável">
              <input
                value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
              />
            </FormField>
            <FormField label="Prazo">
              <input
                type="date"
                value={toDateInput(form.deadline)}
                onChange={(e) => setForm({ ...form, deadline: fromDateInput(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as RegulationStatus })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="atendido">Atendido</option>
                <option value="vencido">Vencido</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="regulations_page__form__actions">
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
        isOpen={!!regulationToDelete}
        title="Excluir regulamentação"
        message={`Excluir "${regulationToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setRegulationToDelete(null)}
      />
    </div>
  );
}
