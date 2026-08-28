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
  createProjectMilestone,
  deleteProjectMilestone,
  getDelayedMilestonesCount,
  mapProjectMilestone,
  updateProjectMilestone,
} from "../../../services/projetos/projectMilestones";
import { fetchActiveProjects } from "../../../services/projetos/projects";
import {
  IProjectMilestone,
  ProjectMilestoneInput,
  ProjectMilestoneStatus,
} from "../../../types/projectMilestone";
import { IProject } from "../../../types/project";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<ProjectMilestoneStatus, string> = {
  pendente: "Pendente",
  concluido: "Concluído",
  atrasado: "Atrasado",
};

const STATUS_TONE: Record<ProjectMilestoneStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  concluido: "success",
  atrasado: "danger",
};

const EMPTY_FORM: ProjectMilestoneInput = {
  projectId: "",
  projectName: "",
  title: "",
  dueDate: null,
  estimatedCost: 0,
  actualCost: 0,
  status: "pendente",
  notes: "",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function ControlePrazosCustos() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<IProject[]>([]);
  const [delayedCount, setDelayedCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProjectMilestoneStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("dueDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("dueDate", "asc")],
    [statusFilter]
  );

  const {
    items: milestones,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "projectMilestones",
    constraints,
    mapDoc: mapProjectMilestone,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshDelayedCount = () => {
    getDelayedMilestonesCount()
      .then(setDelayedCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshDelayedCount();
  }, []);

  useEffect(() => {
    fetchActiveProjects()
      .then(setProjects)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectMilestoneInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [milestoneToDelete, setMilestoneToDelete] = useState<IProjectMilestone | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (milestone: IProjectMilestone) => {
    setEditingId(milestone.id);
    setForm({
      projectId: milestone.projectId,
      projectName: milestone.projectName,
      title: milestone.title,
      dueDate: milestone.dueDate,
      estimatedCost: milestone.estimatedCost,
      actualCost: milestone.actualCost,
      status: milestone.status,
      notes: milestone.notes,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setForm({ ...form, projectId, projectName: project?.name ?? "" });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.projectId) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateProjectMilestone(editingId, form);
        showToast("Marco atualizado com sucesso.", "success");
      } else {
        await createProjectMilestone(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Marco criado com sucesso.", "success");
      }
      refresh();
      refreshDelayedCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar marco",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!milestoneToDelete) return;
    try {
      await deleteProjectMilestone(milestoneToDelete.id);
      showToast("Marco excluído.", "success");
      refresh();
      refreshDelayedCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir marco",
        "error"
      );
    } finally {
      setMilestoneToDelete(null);
    }
  };

  return (
    <div className="milestones_page">
      <div className="milestones_page__header">
        <h1>Controle de Prazos e Custos</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo marco
        </Button>
      </div>

      <div className="milestones_page__summary">
        <span>Atrasados</span>
        <strong>{delayedCount}</strong>
      </div>

      <div className="milestones_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectMilestoneStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="concluido">Concluído</option>
          <option value="atrasado">Atrasado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="milestones_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="milestones_page__empty">Carregando marcos...</p>
      ) : milestones.length === 0 ? (
        <p className="milestones_page__empty">
          Nenhum marco encontrado. Cadastre um projeto em andamento antes de
          criar um marco.
        </p>
      ) : (
        <div className="milestones_page__table_wrap">
          <table className="milestones_page__table">
            <thead>
              <tr>
                <th>Marco</th>
                <th>Projeto</th>
                <th>Prazo</th>
                <th>Custo estimado</th>
                <th>Custo real</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {milestones.map((milestone) => (
                <tr key={milestone.id}>
                  <td>{milestone.title}</td>
                  <td>{milestone.projectName}</td>
                  <td>{toDateInput(milestone.dueDate) || "—"}</td>
                  <td>{currency.format(milestone.estimatedCost)}</td>
                  <td>{currency.format(milestone.actualCost)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[milestone.status]}>
                      {STATUS_LABEL[milestone.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="milestones_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(milestone)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setMilestoneToDelete(milestone)}>
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
        title={editingId ? "Editar marco" : "Novo marco"}
      >
        <form className="milestones_page__form" onSubmit={handleSubmit}>
          <div className="milestones_page__form__grid">
            <FormField label="Projeto*">
              <select
                required
                value={form.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                <option value="">Selecione o projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Marco*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </FormField>
            <FormField label="Prazo">
              <input
                type="date"
                value={toDateInput(form.dueDate)}
                onChange={(e) => setForm({ ...form, dueDate: fromDateInput(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProjectMilestoneStatus })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="concluido">Concluído</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </FormField>
            <FormField label="Custo estimado (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedCost}
                onChange={(e) =>
                  setForm({ ...form, estimatedCost: Number(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Custo real (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.actualCost}
                onChange={(e) => setForm({ ...form, actualCost: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="milestones_page__form__actions">
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
        isOpen={!!milestoneToDelete}
        title="Excluir marco"
        message={`Excluir "${milestoneToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setMilestoneToDelete(null)}
      />
    </div>
  );
}
