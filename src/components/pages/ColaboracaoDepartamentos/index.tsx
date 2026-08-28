import { FormEvent, useEffect, useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
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
  createDepartmentInitiative,
  deleteDepartmentInitiative,
  getActiveInitiativesCount,
  mapDepartmentInitiative,
  updateDepartmentInitiative,
} from "../../../services/colaboracao/departmentInitiatives";
import {
  DepartmentInitiativeInput,
  DepartmentInitiativeStatus,
  IDepartmentInitiative,
} from "../../../types/departmentInitiative";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<DepartmentInitiativeStatus, string> = {
  proposta: "Proposta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const STATUS_TONE: Record<DepartmentInitiativeStatus, "info" | "warning" | "success"> = {
  proposta: "info",
  em_andamento: "warning",
  concluida: "success",
};

const EMPTY_FORM: DepartmentInitiativeInput = {
  title: "",
  departments: "",
  description: "",
  leadName: "",
  status: "proposta",
  notes: "",
};

export default function ColaboracaoDepartamentos() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeCount, setActiveCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<DepartmentInitiativeStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: initiatives,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "departmentInitiatives",
    constraints,
    mapDoc: mapDepartmentInitiative,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshActiveCount = () => {
    getActiveInitiativesCount()
      .then(setActiveCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshActiveCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DepartmentInitiativeInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [initiativeToDelete, setInitiativeToDelete] = useState<IDepartmentInitiative | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (initiative: IDepartmentInitiative) => {
    setEditingId(initiative.id);
    setForm({
      title: initiative.title,
      departments: initiative.departments,
      description: initiative.description,
      leadName: initiative.leadName,
      status: initiative.status,
      notes: initiative.notes,
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
        await updateDepartmentInitiative(editingId, form);
        showToast("Iniciativa atualizada com sucesso.", "success");
      } else {
        await createDepartmentInitiative(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Iniciativa criada com sucesso.", "success");
      }
      refresh();
      refreshActiveCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar iniciativa",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initiativeToDelete) return;
    try {
      await deleteDepartmentInitiative(initiativeToDelete.id);
      showToast("Iniciativa excluída.", "success");
      refresh();
      refreshActiveCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir iniciativa",
        "error"
      );
    } finally {
      setInitiativeToDelete(null);
    }
  };

  return (
    <div className="initiatives_page">
      <div className="initiatives_page__header">
        <h1>Colaboração de Departamentos</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova iniciativa
        </Button>
      </div>

      <div className="initiatives_page__summary">
        <span>Em andamento</span>
        <strong>{activeCount}</strong>
      </div>

      <div className="initiatives_page__filters">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as DepartmentInitiativeStatus | "all")
          }
        >
          <option value="all">Todos os status</option>
          <option value="proposta">Proposta</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="initiatives_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="initiatives_page__empty">Carregando iniciativas...</p>
      ) : initiatives.length === 0 ? (
        <p className="initiatives_page__empty">Nenhuma iniciativa encontrada.</p>
      ) : (
        <div className="initiatives_page__table_wrap">
          <table className="initiatives_page__table">
            <thead>
              <tr>
                <th>Iniciativa</th>
                <th>Departamentos</th>
                <th>Responsável</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {initiatives.map((initiative) => (
                <tr key={initiative.id}>
                  <td>{initiative.title}</td>
                  <td>{initiative.departments || "—"}</td>
                  <td>{initiative.leadName || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[initiative.status]}>
                      {STATUS_LABEL[initiative.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="initiatives_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(initiative)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setInitiativeToDelete(initiative)}>
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
        title={editingId ? "Editar iniciativa" : "Nova iniciativa"}
      >
        <form className="initiatives_page__form" onSubmit={handleSubmit}>
          <div className="initiatives_page__form__grid">
            <FormField label="Iniciativa*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </FormField>
            <FormField label="Departamentos envolvidos">
              <input
                placeholder="ex: RH + TI"
                value={form.departments}
                onChange={(e) => setForm({ ...form, departments: e.target.value })}
              />
            </FormField>
            <FormField label="Responsável">
              <input
                value={form.leadName}
                onChange={(e) => setForm({ ...form, leadName: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as DepartmentInitiativeStatus })
                }
              >
                <option value="proposta">Proposta</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
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
          <div className="initiatives_page__form__actions">
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
        isOpen={!!initiativeToDelete}
        title="Excluir iniciativa"
        message={`Excluir "${initiativeToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setInitiativeToDelete(null)}
      />
    </div>
  );
}
