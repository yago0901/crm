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
  createResourceAllocation,
  deleteResourceAllocation,
  getActiveAllocationsCount,
  mapResourceAllocation,
  updateResourceAllocation,
} from "../../../services/projetos/resourceAllocations";
import { fetchActiveProjects } from "../../../services/projetos/projects";
import { fetchActiveEmployees } from "../../../services/rh/employees";
import {
  IResourceAllocation,
  ResourceAllocationInput,
  ResourceAllocationStatus,
} from "../../../types/resourceAllocation";
import { IProject } from "../../../types/project";
import { IEmployee } from "../../../types/employee";
import "./styles.scss";

const STATUS_LABEL: Record<ResourceAllocationStatus, string> = {
  ativa: "Ativa",
  encerrada: "Encerrada",
};

const STATUS_TONE: Record<ResourceAllocationStatus, "success" | "neutral"> = {
  ativa: "success",
  encerrada: "neutral",
};

const EMPTY_FORM: ResourceAllocationInput = {
  projectId: "",
  projectName: "",
  employeeId: "",
  employeeName: "",
  role: "",
  allocationPercent: 100,
  startDate: null,
  endDate: null,
  status: "ativa",
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

const PAGE_SIZE = 10;

export default function AlocacaoRecursos() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<IProject[]>([]);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ResourceAllocationStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("startDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("startDate", "asc")],
    [statusFilter]
  );

  const {
    items: allocations,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "resourceAllocations",
    constraints,
    mapDoc: mapResourceAllocation,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshActiveCount = () => {
    getActiveAllocationsCount()
      .then(setActiveCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshActiveCount();
  }, []);

  useEffect(() => {
    fetchActiveProjects()
      .then(setProjects)
      .catch((err) => setLoadError(err.message));
    fetchActiveEmployees()
      .then(setEmployees)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResourceAllocationInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [allocationToDelete, setAllocationToDelete] = useState<IResourceAllocation | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (allocation: IResourceAllocation) => {
    setEditingId(allocation.id);
    setForm({
      projectId: allocation.projectId,
      projectName: allocation.projectName,
      employeeId: allocation.employeeId,
      employeeName: allocation.employeeName,
      role: allocation.role,
      allocationPercent: allocation.allocationPercent,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
      status: allocation.status,
      notes: allocation.notes,
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

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setForm({ ...form, employeeId, employeeName: employee?.name ?? "" });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.projectId || !form.employeeId) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateResourceAllocation(editingId, form);
        showToast("Alocação atualizada com sucesso.", "success");
      } else {
        await createResourceAllocation(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Alocação criada com sucesso.", "success");
      }
      refresh();
      refreshActiveCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar alocação",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!allocationToDelete) return;
    try {
      await deleteResourceAllocation(allocationToDelete.id);
      showToast("Alocação excluída.", "success");
      refresh();
      refreshActiveCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir alocação",
        "error"
      );
    } finally {
      setAllocationToDelete(null);
    }
  };

  return (
    <div className="allocations_page">
      <div className="allocations_page__header">
        <h1>Alocação de Recursos</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova alocação
        </Button>
      </div>

      <div className="allocations_page__summary">
        <span>Alocações ativas</span>
        <strong>{activeCount}</strong>
      </div>

      <div className="allocations_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ResourceAllocationStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="ativa">Ativa</option>
          <option value="encerrada">Encerrada</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="allocations_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="allocations_page__empty">Carregando alocações...</p>
      ) : allocations.length === 0 ? (
        <p className="allocations_page__empty">
          Nenhuma alocação encontrada. Cadastre um projeto em andamento e
          funcionários ativos antes de alocar recursos.
        </p>
      ) : (
        <div className="allocations_page__table_wrap">
          <table className="allocations_page__table">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Funcionário</th>
                <th>Função</th>
                <th>Alocação</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => (
                <tr key={allocation.id}>
                  <td>{allocation.projectName}</td>
                  <td>{allocation.employeeName}</td>
                  <td>{allocation.role || "—"}</td>
                  <td>{allocation.allocationPercent}%</td>
                  <td>
                    <Badge tone={STATUS_TONE[allocation.status]}>
                      {STATUS_LABEL[allocation.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="allocations_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(allocation)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setAllocationToDelete(allocation)}>
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
        title={editingId ? "Editar alocação" : "Nova alocação"}
      >
        <form className="allocations_page__form" onSubmit={handleSubmit}>
          <div className="allocations_page__form__grid">
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
            <FormField label="Funcionário*">
              <select
                required
                value={form.employeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
              >
                <option value="">Selecione o funcionário</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Função">
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </FormField>
            <FormField label="Alocação (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={form.allocationPercent}
                onChange={(e) =>
                  setForm({ ...form, allocationPercent: Number(e.target.value) })
                }
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
                  setForm({ ...form, status: e.target.value as ResourceAllocationStatus })
                }
              >
                <option value="ativa">Ativa</option>
                <option value="encerrada">Encerrada</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="allocations_page__form__actions">
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
        isOpen={!!allocationToDelete}
        title="Excluir alocação"
        message={`Excluir a alocação de "${allocationToDelete?.employeeName}" em "${allocationToDelete?.projectName}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setAllocationToDelete(null)}
      />
    </div>
  );
}
