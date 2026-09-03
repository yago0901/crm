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
  createComplianceItem,
  deleteComplianceItem,
  getNonConformitiesCount,
  mapComplianceItem,
  updateComplianceItem,
} from "../../../services/compliance/complianceItems";
import { ComplianceItemInput, ComplianceStatus, IComplianceItem } from "../../../types/complianceItem";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  conforme: "Conforme",
  nao_conforme: "Não conforme",
  em_analise: "Em análise",
};

const STATUS_TONE: Record<ComplianceStatus, "success" | "danger" | "warning"> = {
  conforme: "success",
  nao_conforme: "danger",
  em_analise: "warning",
};

const EMPTY_FORM: ComplianceItemInput = {
  title: "",
  category: "",
  responsible: "",
  reviewDate: null,
  status: "em_analise",
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function GestaoConformidade() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [nonConformitiesCount, setNonConformitiesCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("reviewDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("reviewDate", "asc")],
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
    collectionPath: "complianceItems",
    constraints,
    mapDoc: mapComplianceItem,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshNonConformitiesCount = () => {
    getNonConformitiesCount()
      .then(setNonConformitiesCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshNonConformitiesCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ComplianceItemInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<IComplianceItem | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (item: IComplianceItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      responsible: item.responsible,
      reviewDate: item.reviewDate,
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
        await updateComplianceItem(editingId, form);
        showToast("Item de conformidade atualizado.", "success");
      } else {
        await createComplianceItem(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Item de conformidade criado.", "success");
      }
      refresh();
      refreshNonConformitiesCount();
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
      await deleteComplianceItem(itemToDelete.id);
      showToast("Item excluído.", "success");
      refresh();
      refreshNonConformitiesCount();
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
    <div className="compliance_page">
      <div className="compliance_page__header">
        <h1>Gestão de Conformidade</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo item
        </Button>
      </div>

      <div
        className={`compliance_page__summary ${
          nonConformitiesCount > 0
            ? "compliance_page__summary--danger"
            : "compliance_page__summary--success"
        }`}
      >
        <span>Não conformidades</span>
        <strong>{nonConformitiesCount}</strong>
      </div>

      <div className="compliance_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ComplianceStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="conforme">Conforme</option>
          <option value="nao_conforme">Não conforme</option>
          <option value="em_analise">Em análise</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="compliance_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="compliance_page__empty">Carregando itens...</p>
      ) : items.length === 0 ? (
        <p className="compliance_page__empty">Nenhum item de conformidade encontrado.</p>
      ) : (
        <div className="compliance_page__table_wrap">
          <table className="compliance_page__table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Responsável</th>
                <th>Revisão</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.category || "—"}</td>
                  <td>{item.responsible || "—"}</td>
                  <td>{toDateInput(item.reviewDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="compliance_page__table__actions">
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
        title={editingId ? "Editar item" : "Novo item de conformidade"}
      >
        <form className="compliance_page__form" onSubmit={handleSubmit}>
          <div className="compliance_page__form__grid">
            <FormField label="Item*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
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
            <FormField label="Data de revisão">
              <input
                type="date"
                value={toDateInput(form.reviewDate)}
                onChange={(e) =>
                  setForm({ ...form, reviewDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ComplianceStatus })
                }
              >
                <option value="conforme">Conforme</option>
                <option value="nao_conforme">Não conforme</option>
                <option value="em_analise">Em análise</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="compliance_page__form__actions">
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
        message={`Excluir "${itemToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
