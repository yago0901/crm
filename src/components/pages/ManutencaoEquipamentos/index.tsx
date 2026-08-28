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
  createMaintenanceRequest,
  deleteMaintenanceRequest,
  getScheduledMaintenanceCount,
  mapMaintenanceRequest,
  updateMaintenanceRequest,
} from "../../../services/producao-manufatura/maintenanceRequests";
import { IMaintenanceRequest, MaintenanceRequestInput, MaintenanceRequestStatus } from "../../../types/maintenanceRequest";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<MaintenanceRequestStatus, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_TONE: Record<MaintenanceRequestStatus, "info" | "warning" | "success" | "danger"> = {
  agendada: "info",
  em_andamento: "warning",
  concluida: "success",
  cancelada: "danger",
};

const EMPTY_FORM: MaintenanceRequestInput = {
  equipmentName: "",
  description: "",
  technician: "",
  scheduledDate: null,
  status: "agendada",
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function ManutencaoEquipamentos() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [scheduledCount, setScheduledCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<MaintenanceRequestStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("scheduledDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("scheduledDate", "asc")],
    [statusFilter]
  );

  const {
    items: requests,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "maintenanceRequests",
    constraints,
    mapDoc: mapMaintenanceRequest,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshScheduledCount = () => {
    getScheduledMaintenanceCount()
      .then(setScheduledCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshScheduledCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaintenanceRequestInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [requestToDelete, setRequestToDelete] = useState<IMaintenanceRequest | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (request: IMaintenanceRequest) => {
    setEditingId(request.id);
    setForm({
      equipmentName: request.equipmentName,
      description: request.description,
      technician: request.technician,
      scheduledDate: request.scheduledDate,
      status: request.status,
      notes: request.notes,
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
        await updateMaintenanceRequest(editingId, form);
        showToast("Manutenção atualizada com sucesso.", "success");
      } else {
        await createMaintenanceRequest(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Manutenção registrada com sucesso.", "success");
      }
      refresh();
      refreshScheduledCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar manutenção",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!requestToDelete) return;
    try {
      await deleteMaintenanceRequest(requestToDelete.id);
      showToast("Manutenção excluída.", "success");
      refresh();
      refreshScheduledCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir manutenção",
        "error"
      );
    } finally {
      setRequestToDelete(null);
    }
  };

  return (
    <div className="maintenance_page">
      <div className="maintenance_page__header">
        <h1>Manutenção de Equipamentos</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova manutenção
        </Button>
      </div>

      <div className="maintenance_page__summary">
        <span>Agendadas</span>
        <strong>{scheduledCount}</strong>
      </div>

      <div className="maintenance_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MaintenanceRequestStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="agendada">Agendada</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="maintenance_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="maintenance_page__empty">Carregando manutenções...</p>
      ) : requests.length === 0 ? (
        <p className="maintenance_page__empty">Nenhuma manutenção encontrada.</p>
      ) : (
        <div className="maintenance_page__table_wrap">
          <table className="maintenance_page__table">
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Descrição</th>
                <th>Técnico</th>
                <th>Agendada para</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.equipmentName}</td>
                  <td>{request.description || "—"}</td>
                  <td>{request.technician || "—"}</td>
                  <td>{toDateInput(request.scheduledDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[request.status]}>
                      {STATUS_LABEL[request.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="maintenance_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(request)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setRequestToDelete(request)}>
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
        title={editingId ? "Editar manutenção" : "Nova manutenção"}
      >
        <form className="maintenance_page__form" onSubmit={handleSubmit}>
          <div className="maintenance_page__form__grid">
            <FormField label="Equipamento*">
              <input
                required
                value={form.equipmentName}
                onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
              />
            </FormField>
            <FormField label="Técnico">
              <input
                value={form.technician}
                onChange={(e) => setForm({ ...form, technician: e.target.value })}
              />
            </FormField>
            <FormField label="Data agendada">
              <input
                type="date"
                value={toDateInput(form.scheduledDate)}
                onChange={(e) =>
                  setForm({ ...form, scheduledDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as MaintenanceRequestStatus })
                }
              >
                <option value="agendada">Agendada</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </FormField>
          </div>
          <FormField label="Descrição">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="maintenance_page__form__actions">
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
        isOpen={!!requestToDelete}
        title="Excluir manutenção"
        message={`Excluir a manutenção de "${requestToDelete?.equipmentName}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setRequestToDelete(null)}
      />
    </div>
  );
}
