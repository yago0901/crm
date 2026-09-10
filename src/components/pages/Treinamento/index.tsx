import { FormEvent, useEffect, useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
import {
  MAX_INPUT_DATE,
  MIN_INPUT_DATE,
  fromDateInput,
  toDateInput,
} from "../../../utils/dateInput";
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
  createTraining,
  deleteTraining,
  getScheduledTrainingsCount,
  mapTraining,
  updateTraining,
} from "../../../services/rh/trainings";
import { fetchActiveEmployees } from "../../../services/rh/employees";
import {
  ITraining,
  ITrainingParticipant,
  TrainingInput,
  TrainingStatus,
} from "../../../types/training";
import { IEmployee } from "../../../types/employee";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<TrainingStatus, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<TrainingStatus, "info" | "warning" | "success" | "danger"> = {
  planejado: "info",
  em_andamento: "warning",
  concluido: "success",
  cancelado: "danger",
};

const EMPTY_FORM: TrainingInput = {
  title: "",
  description: "",
  category: "",
  date: null,
  status: "planejado",
  participants: [],
  rating: 0,
  notes: "",
};

export default function Treinamento() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [scheduledCount, setScheduledCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<IEmployee[]>([]);

  const [statusFilter, setStatusFilter] = useState<TrainingStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("date", "asc")]
        : [where("status", "==", statusFilter), orderBy("date", "asc")],
    [statusFilter]
  );

  const {
    items: trainings,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "trainings",
    constraints,
    mapDoc: mapTraining,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshScheduledCount = () => {
    getScheduledTrainingsCount()
      .then(setScheduledCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshScheduledCount();
  }, []);

  useEffect(() => {
    fetchActiveEmployees()
      .then(setEmployees)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrainingInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [participantDraftId, setParticipantDraftId] = useState("");

  const [trainingToDelete, setTrainingToDelete] = useState<ITraining | null>(null);

  const participants = useMemo(() => form.participants ?? [], [form.participants]);

  const attendanceSummary = useMemo(() => {
    const present = participants.filter((p) => p.attended).length;
    const certificates = participants.filter((p) => p.certificateIssued).length;
    return { present, certificates, total: participants.length };
  }, [participants]);

  const availableEmployees = useMemo(
    () => employees.filter((e) => !participants.some((p) => p.employeeId === e.id)),
    [employees, participants]
  );

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setParticipantDraftId("");
    setIsFormOpen(true);
  };

  const openEditForm = (training: ITraining) => {
    setEditingId(training.id);
    setForm({
      title: training.title,
      description: training.description,
      category: training.category,
      date: training.date,
      status: training.status,
      participants: training.participants ?? [],
      rating: training.rating ?? 0,
      notes: training.notes,
    });
    setParticipantDraftId("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setParticipantDraftId("");
  };

  const addParticipant = () => {
    const employee = employees.find((e) => e.id === participantDraftId);
    if (!employee) return;
    const entry: ITrainingParticipant = {
      employeeId: employee.id,
      employeeName: employee.name,
      attended: false,
      score: 0,
      certificateIssued: false,
    };
    setForm({ ...form, participants: [...participants, entry] });
    setParticipantDraftId("");
  };

  const updateParticipant = (index: number, patch: Partial<ITrainingParticipant>) => {
    setForm({
      ...form,
      participants: participants.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    });
  };

  const removeParticipant = (index: number) => {
    setForm({ ...form, participants: participants.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateTraining(editingId, form);
        showToast("Treinamento atualizado com sucesso.", "success");
      } else {
        await createTraining(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Treinamento criado com sucesso.", "success");
      }
      refresh();
      refreshScheduledCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar treinamento",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trainingToDelete) return;
    try {
      await deleteTraining(trainingToDelete.id);
      showToast("Treinamento excluído.", "success");
      refresh();
      refreshScheduledCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir treinamento",
        "error"
      );
    } finally {
      setTrainingToDelete(null);
    }
  };

  return (
    <div className="trainings_page">
      <div className="trainings_page__header">
        <h1>Treinamento</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo treinamento
        </Button>
      </div>

      <div className="trainings_page__summary">
        <span>Planejados</span>
        <strong>{scheduledCount}</strong>
      </div>

      <div className="trainings_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TrainingStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="planejado">Planejado</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="trainings_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="trainings_page__empty">Carregando treinamentos...</p>
      ) : trainings.length === 0 ? (
        <p className="trainings_page__empty">Nenhum treinamento encontrado.</p>
      ) : (
        <div className="trainings_page__table_wrap">
          <table className="trainings_page__table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Participantes</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {trainings.map((training) => {
                const roster = training.participants ?? [];
                const present = roster.filter((p) => p.attended).length;
                return (
                  <tr key={training.id}>
                    <td>{training.title}</td>
                    <td>{training.category || "—"}</td>
                    <td>{toDateInput(training.date) || "—"}</td>
                    <td>{roster.length > 0 ? `${present}/${roster.length} presentes` : "—"}</td>
                    <td>
                      <Badge tone={STATUS_TONE[training.status]}>
                        {STATUS_LABEL[training.status]}
                      </Badge>
                    </td>
                    <td>
                      <div className="trainings_page__table__actions">
                        <Button variant="secondary" onClick={() => openEditForm(training)}>
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => setTrainingToDelete(training)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
        title={editingId ? "Editar treinamento" : "Novo treinamento"}
      >
        <form className="trainings_page__form" onSubmit={handleSubmit}>
          <div className="trainings_page__form__grid">
            <FormField label="Título*">
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
            <FormField label="Data">
              <input
                type="date"
                min={MIN_INPUT_DATE}
                max={MAX_INPUT_DATE}
                value={toDateInput(form.date)}
                onChange={(e) => setForm({ ...form, date: fromDateInput(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as TrainingStatus })
                }
              >
                <option value="planejado">Planejado</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormField>
            <FormField label="Avaliação do treinamento (0 a 5)">
              <input
                type="number"
                min="0"
                max="5"
                step="0.5"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              />
            </FormField>
          </div>

          <div className="trainings_page__section">
            <h3>Participantes</h3>
            {participants.length > 0 && (
              <table className="trainings_page__participants">
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th>Presente</th>
                    <th>Nota</th>
                    <th>Certificado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, index) => (
                    <tr key={participant.employeeId}>
                      <td>{participant.employeeName}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={participant.attended}
                          onChange={(e) =>
                            updateParticipant(index, { attended: e.target.checked })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={participant.score}
                          onChange={(e) =>
                            updateParticipant(index, { score: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={participant.certificateIssued}
                          onChange={(e) =>
                            updateParticipant(index, { certificateIssued: e.target.checked })
                          }
                        />
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => removeParticipant(index)}
                        >
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="trainings_page__draft">
              <FormField label="Adicionar participante">
                <select
                  value={participantDraftId}
                  onChange={(e) => setParticipantDraftId(e.target.value)}
                >
                  <option value="">Selecione o funcionário</option>
                  {availableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <Button type="button" variant="secondary" onClick={addParticipant}>
                + Adicionar
              </Button>
            </div>
            {participants.length > 0 && (
              <p className="trainings_page__hint">
                {attendanceSummary.present} de {attendanceSummary.total} presentes ·{" "}
                {attendanceSummary.certificates} certificado
                {attendanceSummary.certificates === 1 ? "" : "s"} emitido
                {attendanceSummary.certificates === 1 ? "" : "s"}
              </p>
            )}
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
          <div className="trainings_page__form__actions">
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
        isOpen={!!trainingToDelete}
        title="Excluir treinamento"
        message={`Excluir "${trainingToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setTrainingToDelete(null)}
      />
    </div>
  );
}
