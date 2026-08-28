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
  createProject,
  deleteProject,
  getActiveProjectsCount,
  mapProject,
  updateProject,
} from "../../../services/projetos/projects";
import { IProject, ProjectInput, ProjectStatus } from "../../../types/project";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<ProjectStatus, "info" | "warning" | "success" | "danger"> = {
  planejamento: "info",
  em_andamento: "warning",
  concluido: "success",
  cancelado: "danger",
};

const EMPTY_FORM: ProjectInput = {
  name: "",
  description: "",
  budget: 0,
  startDate: null,
  endDate: null,
  status: "planejamento",
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

export default function PlanejamentoProjetos() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeCount, setActiveCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("startDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("startDate", "asc")],
    [statusFilter]
  );

  const {
    items: projects,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "projects",
    constraints,
    mapDoc: mapProject,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshActiveCount = () => {
    getActiveProjectsCount()
      .then(setActiveCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshActiveCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (project: IProject) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      description: project.description,
      budget: project.budget,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      notes: project.notes,
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
        await updateProject(editingId, form);
        showToast("Projeto atualizado com sucesso.", "success");
      } else {
        await createProject(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Projeto criado com sucesso.", "success");
      }
      refresh();
      refreshActiveCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar projeto",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete.id);
      showToast("Projeto excluído.", "success");
      refresh();
      refreshActiveCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir projeto",
        "error"
      );
    } finally {
      setProjectToDelete(null);
    }
  };

  return (
    <div className="projects_page">
      <div className="projects_page__header">
        <h1>Planejamento de Projetos</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo projeto
        </Button>
      </div>

      <div className="projects_page__summary">
        <span>Em andamento</span>
        <strong>{activeCount}</strong>
      </div>

      <div className="projects_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="planejamento">Planejamento</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="projects_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="projects_page__empty">Carregando projetos...</p>
      ) : projects.length === 0 ? (
        <p className="projects_page__empty">Nenhum projeto encontrado.</p>
      ) : (
        <div className="projects_page__table_wrap">
          <table className="projects_page__table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Orçamento</th>
                <th>Início</th>
                <th>Término</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{currency.format(project.budget)}</td>
                  <td>{toDateInput(project.startDate) || "—"}</td>
                  <td>{toDateInput(project.endDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[project.status]}>
                      {STATUS_LABEL[project.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="projects_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(project)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setProjectToDelete(project)}>
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
        title={editingId ? "Editar projeto" : "Novo projeto"}
      >
        <form className="projects_page__form" onSubmit={handleSubmit}>
          <div className="projects_page__form__grid">
            <FormField label="Nome*">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Orçamento (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Início">
              <input
                type="date"
                value={toDateInput(form.startDate)}
                onChange={(e) =>
                  setForm({ ...form, startDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Término">
              <input
                type="date"
                value={toDateInput(form.endDate)}
                onChange={(e) =>
                  setForm({ ...form, endDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProjectStatus })
                }
              >
                <option value="planejamento">Planejamento</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
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
          <div className="projects_page__form__actions">
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
        isOpen={!!projectToDelete}
        title="Excluir projeto"
        message={`Excluir "${projectToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}
