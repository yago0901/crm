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
  createQualityCheck,
  deleteQualityCheck,
  getFailedQualityChecksCount,
  mapQualityCheck,
  updateQualityCheck,
} from "../../../services/producao-manufatura/qualityChecks";
import { IQualityCheck, QualityCheckInput, QualityCheckStatus } from "../../../types/qualityCheck";
import "./styles.scss";

const STATUS_LABEL: Record<QualityCheckStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_TONE: Record<QualityCheckStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  aprovado: "success",
  reprovado: "danger",
};

const EMPTY_FORM: QualityCheckInput = {
  item: "",
  category: "",
  inspector: "",
  inspectionDate: null,
  status: "pendente",
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

const PAGE_SIZE = 10;

export default function ControleQualidade() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [failedCount, setFailedCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<QualityCheckStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("inspectionDate", "desc")]
        : [where("status", "==", statusFilter), orderBy("inspectionDate", "desc")],
    [statusFilter]
  );

  const {
    items: checks,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "qualityChecks",
    constraints,
    mapDoc: mapQualityCheck,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshFailedCount = () => {
    getFailedQualityChecksCount()
      .then(setFailedCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshFailedCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QualityCheckInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [checkToDelete, setCheckToDelete] = useState<IQualityCheck | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (check: IQualityCheck) => {
    setEditingId(check.id);
    setForm({
      item: check.item,
      category: check.category,
      inspector: check.inspector,
      inspectionDate: check.inspectionDate,
      status: check.status,
      notes: check.notes,
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
        await updateQualityCheck(editingId, form);
        showToast("Inspeção atualizada com sucesso.", "success");
      } else {
        await createQualityCheck(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Inspeção registrada com sucesso.", "success");
      }
      refresh();
      refreshFailedCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar inspeção",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!checkToDelete) return;
    try {
      await deleteQualityCheck(checkToDelete.id);
      showToast("Inspeção excluída.", "success");
      refresh();
      refreshFailedCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir inspeção",
        "error"
      );
    } finally {
      setCheckToDelete(null);
    }
  };

  return (
    <div className="quality_checks_page">
      <div className="quality_checks_page__header">
        <h1>Controle de Qualidade</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova inspeção
        </Button>
      </div>

      <div className="quality_checks_page__summary">
        <span>Reprovações</span>
        <strong>{failedCount}</strong>
      </div>

      <div className="quality_checks_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as QualityCheckStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="reprovado">Reprovado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="quality_checks_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="quality_checks_page__empty">Carregando inspeções...</p>
      ) : checks.length === 0 ? (
        <p className="quality_checks_page__empty">Nenhuma inspeção encontrada.</p>
      ) : (
        <div className="quality_checks_page__table_wrap">
          <table className="quality_checks_page__table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Inspetor</th>
                <th>Data</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.id}>
                  <td>{check.item}</td>
                  <td>{check.category || "—"}</td>
                  <td>{check.inspector || "—"}</td>
                  <td>{toDateInput(check.inspectionDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[check.status]}>
                      {STATUS_LABEL[check.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="quality_checks_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(check)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setCheckToDelete(check)}>
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
        title={editingId ? "Editar inspeção" : "Nova inspeção"}
      >
        <form className="quality_checks_page__form" onSubmit={handleSubmit}>
          <div className="quality_checks_page__form__grid">
            <FormField label="Item*">
              <input
                required
                value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
              />
            </FormField>
            <FormField label="Categoria">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </FormField>
            <FormField label="Inspetor">
              <input
                value={form.inspector}
                onChange={(e) => setForm({ ...form, inspector: e.target.value })}
              />
            </FormField>
            <FormField label="Data da inspeção">
              <input
                type="date"
                value={toDateInput(form.inspectionDate)}
                onChange={(e) =>
                  setForm({ ...form, inspectionDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as QualityCheckStatus })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="reprovado">Reprovado</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="quality_checks_page__form__actions">
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
        isOpen={!!checkToDelete}
        title="Excluir inspeção"
        message={`Excluir a inspeção de "${checkToDelete?.item}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setCheckToDelete(null)}
      />
    </div>
  );
}
