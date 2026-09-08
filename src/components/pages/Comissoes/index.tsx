import { FormEvent, useEffect, useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
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
  createCommission,
  deleteCommission,
  getPendingCommissionsTotal,
  mapCommission,
  markCommissionPaid,
  updateCommission,
} from "../../../services/vendas-crm/commissions";
import { fetchActiveEmployees } from "../../../services/rh/employees";
import { fetchApprovedSalesOrders } from "../../../services/vendas-crm/salesOrders";
import { CommissionInput, CommissionStatus, ICommission } from "../../../types/commission";
import { IEmployee } from "../../../types/employee";
import { ISalesOrder } from "../../../types/salesOrder";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<CommissionStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
};

const STATUS_TONE: Record<CommissionStatus, "warning" | "success"> = {
  pendente: "warning",
  pago: "success",
};

const EMPTY_FORM: CommissionInput = {
  employeeId: "",
  employeeName: "",
  salesOrderId: "",
  salesOrderReference: "",
  saleValue: 0,
  commissionRate: 0,
  commissionValue: 0,
  status: "pendente",
  notes: "",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const computeCommissionValue = (saleValue: number, rate: number): number =>
  Number(((saleValue * rate) / 100).toFixed(2));

export default function Comissoes() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [salesOrders, setSalesOrders] = useState<ISalesOrder[]>([]);
  const [totalPendente, setTotalPendente] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<CommissionStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: commissions,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "commissions",
    constraints,
    mapDoc: mapCommission,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshTotal = () => {
    getPendingCommissionsTotal()
      .then(setTotalPendente)
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

  useEffect(() => {
    fetchApprovedSalesOrders()
      .then(setSalesOrders)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CommissionInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [commissionToDelete, setCommissionToDelete] = useState<ICommission | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (commission: ICommission) => {
    setEditingId(commission.id);
    setForm({
      employeeId: commission.employeeId,
      employeeName: commission.employeeName,
      salesOrderId: commission.salesOrderId ?? "",
      salesOrderReference: commission.salesOrderReference ?? "",
      saleValue: commission.saleValue,
      commissionRate: commission.commissionRate,
      commissionValue: commission.commissionValue,
      status: commission.status,
      notes: commission.notes,
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
    const rate = employee?.commissionRate ?? form.commissionRate;
    setForm({
      ...form,
      employeeId,
      employeeName: employee?.name ?? "",
      commissionRate: rate,
      commissionValue: computeCommissionValue(form.saleValue, rate),
    });
  };

  const handleSalesOrderChange = (salesOrderId: string) => {
    const order = salesOrders.find((o) => o.id === salesOrderId);
    const saleValue = order?.total ?? form.saleValue;
    setForm({
      ...form,
      salesOrderId,
      salesOrderReference: order ? `${order.contactName} — ${currency.format(order.total)}` : "",
      saleValue,
      commissionValue: computeCommissionValue(saleValue, form.commissionRate),
    });
  };

  const handleSaleValueChange = (saleValue: number) => {
    setForm({
      ...form,
      saleValue,
      commissionValue: computeCommissionValue(saleValue, form.commissionRate),
    });
  };

  const handleRateChange = (commissionRate: number) => {
    setForm({
      ...form,
      commissionRate,
      commissionValue: computeCommissionValue(form.saleValue, commissionRate),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.employeeId) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateCommission(editingId, form);
        showToast("Comissão atualizada com sucesso.", "success");
      } else {
        await createCommission(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Comissão cadastrada com sucesso.", "success");
      }
      refresh();
      refreshTotal();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar comissão",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (commission: ICommission) => {
    try {
      await markCommissionPaid(commission.id);
      showToast("Comissão marcada como paga.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar comissão",
        "error"
      );
    }
  };

  const handleDelete = async () => {
    if (!commissionToDelete) return;
    try {
      await deleteCommission(commissionToDelete.id);
      showToast("Comissão excluída.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir comissão",
        "error"
      );
    } finally {
      setCommissionToDelete(null);
    }
  };

  return (
    <div className="commissions_page">
      <div className="commissions_page__header">
        <h1>Comissões</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova comissão
        </Button>
      </div>

      <div className="commissions_page__summary">
        <span>Total pendente</span>
        <strong>{currency.format(totalPendente)}</strong>
      </div>

      <div className="commissions_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="commissions_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="commissions_page__empty">Carregando comissões...</p>
      ) : commissions.length === 0 ? (
        <p className="commissions_page__empty">
          Nenhuma comissão encontrada. Cadastre funcionários ativos em Gestão de Funcionários
          antes de lançar uma comissão.
        </p>
      ) : (
        <div className="commissions_page__table_wrap">
          <table className="commissions_page__table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Venda</th>
                <th>%</th>
                <th>Comissão</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {commissions.map((commission) => (
                <tr key={commission.id}>
                  <td>{commission.employeeName}</td>
                  <td>{currency.format(commission.saleValue)}</td>
                  <td>{commission.commissionRate}%</td>
                  <td>{currency.format(commission.commissionValue)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[commission.status]}>
                      {STATUS_LABEL[commission.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="commissions_page__table__actions">
                      {commission.status !== "pago" && (
                        <Button variant="secondary" onClick={() => handleMarkPaid(commission)}>
                          Marcar pago
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => openEditForm(commission)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setCommissionToDelete(commission)}>
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
        title={editingId ? "Editar comissão" : "Nova comissão"}
      >
        <form className="commissions_page__form" onSubmit={handleSubmit}>
          <div className="commissions_page__form__grid">
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
            <FormField label="Pedido de venda vinculado (opcional)">
              <select
                value={form.salesOrderId}
                onChange={(e) => handleSalesOrderChange(e.target.value)}
              >
                <option value="">Nenhum (preencher manualmente)</option>
                {salesOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.contactName} — {currency.format(order.total)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Valor da venda (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.saleValue}
                onChange={(e) => handleSaleValueChange(Number(e.target.value))}
              />
            </FormField>
            <FormField label="% de comissão">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commissionRate}
                onChange={(e) => handleRateChange(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Valor da comissão (calculado)">
              <input value={currency.format(form.commissionValue)} disabled />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CommissionStatus })}
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
          <div className="commissions_page__form__actions">
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
        isOpen={!!commissionToDelete}
        title="Excluir comissão"
        message={`Excluir a comissão de "${commissionToDelete?.employeeName}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setCommissionToDelete(null)}
      />
    </div>
  );
}
