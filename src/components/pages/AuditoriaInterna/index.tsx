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
  createInternalAudit,
  deleteInternalAudit,
  getPlannedAuditsCount,
  mapInternalAudit,
  updateInternalAudit,
} from "../../../services/compliance/internalAudits";
import { IInternalAudit, InternalAuditInput, InternalAuditStatus } from "../../../types/internalAudit";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<InternalAuditStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const STATUS_TONE: Record<InternalAuditStatus, "info" | "warning" | "success"> = {
  planejada: "info",
  em_andamento: "warning",
  concluida: "success",
};

const EMPTY_FORM: InternalAuditInput = {
  title: "",
  department: "",
  auditor: "",
  auditDate: null,
  status: "planejada",
  findings: "",
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function AuditoriaInterna() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [plannedCount, setPlannedCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<InternalAuditStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("auditDate", "desc")]
        : [where("status", "==", statusFilter), orderBy("auditDate", "desc")],
    [statusFilter]
  );

  const {
    items: audits,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "internalAudits",
    constraints,
    mapDoc: mapInternalAudit,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshPlannedCount = () => {
    getPlannedAuditsCount()
      .then(setPlannedCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshPlannedCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InternalAuditInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [auditToDelete, setAuditToDelete] = useState<IInternalAudit | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (audit: IInternalAudit) => {
    setEditingId(audit.id);
    setForm({
      title: audit.title,
      department: audit.department,
      auditor: audit.auditor,
      auditDate: audit.auditDate,
      status: audit.status,
      findings: audit.findings,
      notes: audit.notes,
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
        await updateInternalAudit(editingId, form);
        showToast("Auditoria atualizada com sucesso.", "success");
      } else {
        await createInternalAudit(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Auditoria criada com sucesso.", "success");
      }
      refresh();
      refreshPlannedCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar auditoria",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!auditToDelete) return;
    try {
      await deleteInternalAudit(auditToDelete.id);
      showToast("Auditoria excluída.", "success");
      refresh();
      refreshPlannedCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir auditoria",
        "error"
      );
    } finally {
      setAuditToDelete(null);
    }
  };

  return (
    <div className="audits_page">
      <div className="audits_page__header">
        <h1>Auditoria Interna</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova auditoria
        </Button>
      </div>

      <div className="audits_page__summary">
        <span>Planejadas</span>
        <strong>{plannedCount}</strong>
      </div>

      <div className="audits_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InternalAuditStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="planejada">Planejada</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="audits_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="audits_page__empty">Carregando auditorias...</p>
      ) : audits.length === 0 ? (
        <p className="audits_page__empty">Nenhuma auditoria encontrada.</p>
      ) : (
        <div className="audits_page__table_wrap">
          <table className="audits_page__table">
            <thead>
              <tr>
                <th>Auditoria</th>
                <th>Departamento</th>
                <th>Auditor</th>
                <th>Data</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id}>
                  <td>{audit.title}</td>
                  <td>{audit.department || "—"}</td>
                  <td>{audit.auditor || "—"}</td>
                  <td>{toDateInput(audit.auditDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[audit.status]}>
                      {STATUS_LABEL[audit.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="audits_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(audit)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setAuditToDelete(audit)}>
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
        title={editingId ? "Editar auditoria" : "Nova auditoria"}
      >
        <form className="audits_page__form" onSubmit={handleSubmit}>
          <div className="audits_page__form__grid">
            <FormField label="Auditoria*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </FormField>
            <FormField label="Departamento">
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </FormField>
            <FormField label="Auditor">
              <input
                value={form.auditor}
                onChange={(e) => setForm({ ...form, auditor: e.target.value })}
              />
            </FormField>
            <FormField label="Data">
              <input
                type="date"
                value={toDateInput(form.auditDate)}
                onChange={(e) => setForm({ ...form, auditDate: fromDateInput(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as InternalAuditStatus })
                }
              >
                <option value="planejada">Planejada</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
              </select>
            </FormField>
          </div>
          <FormField label="Conclusões">
            <textarea
              value={form.findings}
              onChange={(e) => setForm({ ...form, findings: e.target.value })}
            />
          </FormField>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="audits_page__form__actions">
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
        isOpen={!!auditToDelete}
        title="Excluir auditoria"
        message={`Excluir "${auditToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setAuditToDelete(null)}
      />
    </div>
  );
}
