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
  createPayrollEntry,
  deletePayrollEntry,
  getPayrollOpenTotal,
  mapPayrollEntry,
  markPayrollEntryPaid,
  updatePayrollEntry,
} from "../../../services/rh/payroll";
import { fetchActiveEmployees } from "../../../services/rh/employees";
import { IPayrollEntry, PayrollEntryInput, PayrollStatus } from "../../../types/payrollEntry";
import { IEmployee } from "../../../types/employee";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<PayrollStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
};

const STATUS_TONE: Record<PayrollStatus, "warning" | "success"> = {
  pendente: "warning",
  pago: "success",
};

const EMPTY_FORM: PayrollEntryInput = {
  employeeId: "",
  employeeName: "",
  competencia: "",
  baseSalary: 0,
  bonuses: 0,
  deductions: 0,
  netValue: 0,
  status: "pendente",
  notes: "",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function FolhaPagamento() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [totalEmAberto, setTotalEmAberto] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<PayrollStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("competencia", "desc")]
        : [where("status", "==", statusFilter), orderBy("competencia", "desc")],
    [statusFilter]
  );

  const {
    items: entries,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "payrollEntries",
    constraints,
    mapDoc: mapPayrollEntry,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshTotal = () => {
    getPayrollOpenTotal()
      .then(setTotalEmAberto)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshTotal();
  }, []);

  useEffect(() => {
    fetchActiveEmployees()
      .then(setEmployees)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PayrollEntryInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [entryToDelete, setEntryToDelete] = useState<IPayrollEntry | null>(null);

  const recalculateNetValue = (next: Partial<PayrollEntryInput>) => {
    const merged = { ...form, ...next };
    return merged.baseSalary + merged.bonuses - merged.deductions;
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (entry: IPayrollEntry) => {
    setEditingId(entry.id);
    setForm({
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      competencia: entry.competencia,
      baseSalary: entry.baseSalary,
      bonuses: entry.bonuses,
      deductions: entry.deductions,
      netValue: entry.netValue,
      status: entry.status,
      notes: entry.notes,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setForm({
      ...form,
      employeeId,
      employeeName: employee?.name ?? "",
      baseSalary: employee?.salary ?? form.baseSalary,
      netValue: (employee?.salary ?? form.baseSalary) + form.bonuses - form.deductions,
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.employeeId) return;

    setSaving(true);
    try {
      if (editingId) {
        await updatePayrollEntry(editingId, form);
        showToast("Lançamento de folha atualizado.", "success");
      } else {
        await createPayrollEntry(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Lançamento de folha criado.", "success");
      }
      refresh();
      refreshTotal();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar lançamento",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (entry: IPayrollEntry) => {
    try {
      await markPayrollEntryPaid(entry.id);
      showToast("Lançamento marcado como pago.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar lançamento",
        "error"
      );
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deletePayrollEntry(entryToDelete.id);
      showToast("Lançamento excluído.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir lançamento",
        "error"
      );
    } finally {
      setEntryToDelete(null);
    }
  };

  return (
    <div className="payroll_page">
      <div className="payroll_page__header">
        <h1>Folha de Pagamento</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo lançamento
        </Button>
      </div>

      <div className="payroll_page__summary">
        <span>Total em aberto</span>
        <strong>{currency.format(totalEmAberto)}</strong>
      </div>

      <div className="payroll_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PayrollStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="payroll_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="payroll_page__empty">Carregando folha de pagamento...</p>
      ) : entries.length === 0 ? (
        <p className="payroll_page__empty">
          Nenhum lançamento encontrado. Cadastre funcionários ativos em Gestão
          de Funcionários antes de lançar a folha.
        </p>
      ) : (
        <div className="payroll_page__table_wrap">
          <table className="payroll_page__table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Competência</th>
                <th>Salário base</th>
                <th>Líquido</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.employeeName}</td>
                  <td>{entry.competencia}</td>
                  <td>{currency.format(entry.baseSalary)}</td>
                  <td>{currency.format(entry.netValue)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[entry.status]}>
                      {STATUS_LABEL[entry.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="payroll_page__table__actions">
                      {entry.status !== "pago" && (
                        <Button variant="secondary" onClick={() => handleMarkPaid(entry)}>
                          Marcar pago
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => openEditForm(entry)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setEntryToDelete(entry)}>
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
        title={editingId ? "Editar lançamento" : "Novo lançamento"}
      >
        <form className="payroll_page__form" onSubmit={handleSubmit}>
          <div className="payroll_page__form__grid">
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
            <FormField label="Competência*">
              <input
                required
                type="month"
                value={form.competencia}
                onChange={(e) => setForm({ ...form, competencia: e.target.value })}
              />
            </FormField>
            <FormField label="Salário base (R$)*">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.baseSalary}
                onChange={(e) => {
                  const baseSalary = Number(e.target.value);
                  setForm({
                    ...form,
                    baseSalary,
                    netValue: recalculateNetValue({ baseSalary }),
                  });
                }}
              />
            </FormField>
            <FormField label="Bônus (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.bonuses}
                onChange={(e) => {
                  const bonuses = Number(e.target.value);
                  setForm({ ...form, bonuses, netValue: recalculateNetValue({ bonuses }) });
                }}
              />
            </FormField>
            <FormField label="Descontos (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.deductions}
                onChange={(e) => {
                  const deductions = Number(e.target.value);
                  setForm({
                    ...form,
                    deductions,
                    netValue: recalculateNetValue({ deductions }),
                  });
                }}
              />
            </FormField>
            <FormField label="Valor líquido (R$)">
              <input type="number" value={form.netValue} readOnly />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as PayrollStatus })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="payroll_page__form__actions">
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
        isOpen={!!entryToDelete}
        title="Excluir lançamento"
        message={`Excluir o lançamento de "${entryToDelete?.employeeName}" (${entryToDelete?.competencia})?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setEntryToDelete(null)}
      />
    </div>
  );
}
