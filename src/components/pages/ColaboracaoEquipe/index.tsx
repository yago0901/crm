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
  createProjectTask,
  deleteProjectTask,
  getBacklogTasksCount,
  mapProjectTask,
  updateProjectTask,
} from "../../../services/projetos/projectTasks";
import { fetchActiveProjects } from "../../../services/projetos/projects";
import { IProjectTask, ProjectTaskInput, ProjectTaskStatus } from "../../../types/projectTask";
import { IProject } from "../../../types/project";
import "./styles.scss";

const STATUS_LABEL: Record<ProjectTaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const STATUS_TONE: Record<ProjectTaskStatus, "neutral" | "warning" | "success"> = {
  a_fazer: "neutral",
  em_andamento: "warning",
  concluida: "success",
};

const EMPTY_FORM: ProjectTaskInput = {
  projectId: "",
  projectName: "",
  title: "",
  assignee: "",
  dueDate: null,
  status: "a_fazer",
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

const PAGE_SIZE = 10;

export default function ColaboracaoEquipe() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<IProject[]>([]);
  const [backlogCount, setBacklogCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProjectTaskStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("dueDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("dueDate", "asc")],
    [statusFilter]
  );

  const {
    items: tasks,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "projectTasks",
    constraints,
    mapDoc: mapProjectTask,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshBacklogCount = () => {
    getBacklogTasksCount()
      .then(setBacklogCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshBacklogCount();
  }, []);

  useEffect(() => {
    fetchActiveProjects()
      .then(setProjects)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectTaskInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [taskToDelete, setTaskToDelete] = useState<IProjectTask | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (task: IProjectTask) => {
    setEditingId(task.id);
    setForm({
      projectId: task.projectId,
      projectName: task.projectName,
      title: task.title,
      assignee: task.assignee,
      dueDate: task.dueDate,
      status: task.status,
      notes: task.notes,
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
        await updateProjectTask(editingId, form);
        showToast("Tarefa atualizada com sucesso.", "success");
      } else {
        await createProjectTask(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Tarefa criada com sucesso.", "success");
      }
      refresh();
      refreshBacklogCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar tarefa",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteProjectTask(taskToDelete.id);
      showToast("Tarefa excluída.", "success");
      refresh();
      refreshBacklogCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir tarefa",
        "error"
      );
    } finally {
      setTaskToDelete(null);
    }
  };

  return (
    <div className="tasks_page">
      <div className="tasks_page__header">
        <h1>Colaboração de Equipe</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova tarefa
        </Button>
      </div>

      <div className="tasks_page__summary">
        <span>No backlog</span>
        <strong>{backlogCount}</strong>
      </div>

      <div className="tasks_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectTaskStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="a_fazer">A fazer</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="tasks_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="tasks_page__empty">Carregando tarefas...</p>
      ) : tasks.length === 0 ? (
        <p className="tasks_page__empty">
          Nenhuma tarefa encontrada. Cadastre um projeto em andamento antes de
          criar uma tarefa.
        </p>
      ) : (
        <div className="tasks_page__table_wrap">
          <table className="tasks_page__table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Projeto</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.projectName}</td>
                  <td>{task.assignee || "—"}</td>
                  <td>{toDateInput(task.dueDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[task.status]}>
                      {STATUS_LABEL[task.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="tasks_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(task)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setTaskToDelete(task)}>
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
        title={editingId ? "Editar tarefa" : "Nova tarefa"}
      >
        <form className="tasks_page__form" onSubmit={handleSubmit}>
          <div className="tasks_page__form__grid">
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
            <FormField label="Tarefa*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </FormField>
            <FormField label="Responsável">
              <input
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
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
                  setForm({ ...form, status: e.target.value as ProjectTaskStatus })
                }
              >
                <option value="a_fazer">A fazer</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="tasks_page__form__actions">
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
        isOpen={!!taskToDelete}
        title="Excluir tarefa"
        message={`Excluir "${taskToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
}
