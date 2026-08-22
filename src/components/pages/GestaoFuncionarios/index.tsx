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
  createEmployee,
  deleteEmployee,
  getActivePayrollTotal,
  mapEmployee,
  updateEmployee,
} from "../../../services/employees";
import { EmployeeInput, EmployeeStatus, IEmployee } from "../../../types/employee";
import "./styles.scss";

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  ativo: "Ativo",
  ferias: "Férias",
  desligado: "Desligado",
};

const STATUS_TONE: Record<EmployeeStatus, "success" | "warning" | "neutral"> = {
  ativo: "success",
  ferias: "warning",
  desligado: "neutral",
};

const EMPTY_FORM: EmployeeInput = {
  name: "",
  email: "",
  phone: "",
  role: "",
  department: "",
  status: "ativo",
  salary: 0,
  hireDate: null,
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

const PAGE_SIZE = 10;

export default function GestaoFuncionarios() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [totalFolhaAtiva, setTotalFolhaAtiva] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: employees,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "employees",
    constraints,
    mapDoc: mapEmployee,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) =>
      [e.name, e.email, e.role, e.department].some((field) =>
        field?.toLowerCase().includes(term)
      )
    );
  }, [employees, search]);

  const refreshTotal = () => {
    getActivePayrollTotal()
      .then(setTotalFolhaAtiva)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshTotal();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [employeeToDelete, setEmployeeToDelete] = useState<IEmployee | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (employee: IEmployee) => {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      department: employee.department,
      status: employee.status,
      salary: employee.salary,
      hireDate: employee.hireDate,
      notes: employee.notes,
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
        await updateEmployee(editingId, form);
        showToast("Funcionário atualizado com sucesso.", "success");
      } else {
        await createEmployee(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Funcionário cadastrado com sucesso.", "success");
      }
      refresh();
      refreshTotal();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar funcionário",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployee(employeeToDelete.id);
      showToast("Funcionário excluído.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir funcionário",
        "error"
      );
    } finally {
      setEmployeeToDelete(null);
    }
  };

  return (
    <div className="employees_page">
      <div className="employees_page__header">
        <h1>Gestão de Funcionários</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo funcionário
        </Button>
      </div>

      <div className="employees_page__summary">
        <span>Folha de pagamento (ativos)</span>
        <strong>{currency.format(totalFolhaAtiva)}</strong>
      </div>

      <div className="employees_page__filters">
        <input
          type="text"
          placeholder="Buscar na página atual por nome, e-mail, cargo ou departamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as EmployeeStatus | "all")
          }
        >
          <option value="all">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="ferias">Férias</option>
          <option value="desligado">Desligado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="employees_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="employees_page__empty">Carregando funcionários...</p>
      ) : filteredEmployees.length === 0 ? (
        <p className="employees_page__empty">Nenhum funcionário encontrado.</p>
      ) : (
        <div className="employees_page__table_wrap">
          <table className="employees_page__table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Salário</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <strong>{employee.name}</strong>
                    <div>{employee.email}</div>
                  </td>
                  <td>{employee.role}</td>
                  <td>{employee.department}</td>
                  <td>{currency.format(employee.salary)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[employee.status]}>
                      {STATUS_LABEL[employee.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="employees_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(employee)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setEmployeeToDelete(employee)}>
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
        title={editingId ? "Editar funcionário" : "Novo funcionário"}
      >
        <form className="employees_page__form" onSubmit={handleSubmit}>
          <div className="employees_page__form__grid">
            <FormField label="Nome*">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="E-mail*">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
            <FormField label="Telefone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>
            <FormField label="Cargo*">
              <input
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </FormField>
            <FormField label="Departamento*">
              <input
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as EmployeeStatus })
                }
              >
                <option value="ativo">Ativo</option>
                <option value="ferias">Férias</option>
                <option value="desligado">Desligado</option>
              </select>
            </FormField>
            <FormField label="Salário (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salary}
                onChange={(e) =>
                  setForm({ ...form, salary: Number(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Data de admissão">
              <input
                type="date"
                value={toDateInput(form.hireDate)}
                onChange={(e) =>
                  setForm({ ...form, hireDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="employees_page__form__actions">
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
        isOpen={!!employeeToDelete}
        title="Excluir funcionário"
        message={`Excluir "${employeeToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setEmployeeToDelete(null)}
      />
    </div>
  );
}
