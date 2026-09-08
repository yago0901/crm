import { FormEvent, useEffect, useMemo, useState } from "react";
import { Timestamp, orderBy, where } from "firebase/firestore";
import { useAuth } from "../../../contexts/auth/AuthContext";
import { useToast } from "../../common/Toast/ToastContext";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Button from "../../common/Button";
import Badge, { BadgeTone } from "../../common/Badge";
import FormField from "../../common/FormField";
import Pagination from "../../common/Pagination";
import { usePaginatedCollection } from "../../../hooks/usePaginatedCollection";
import {
  createPayable,
  createPayableInstallments,
  deletePayable,
  getPayablesOpenTotal,
  mapPayable,
  markPayablePaid,
  updatePayable,
} from "../../../services/financeiro/finance";
import { FinanceStatus, IPayable, PaymentMethod, PayableInput } from "../../../types/finance";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<FinanceStatus, string> = {
  pendente: "Pendente",
  parcialmente_pago: "Parcialmente pago",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  renegociado: "Renegociado",
  estornado: "Estornado",
};

const STATUS_TONE: Record<FinanceStatus, BadgeTone> = {
  pendente: "warning",
  parcialmente_pago: "info",
  pago: "success",
  atrasado: "danger",
  cancelado: "neutral",
  renegociado: "primary",
  estornado: "neutral",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  boleto: "Boleto",
  pix: "Pix",
  cartao: "Cartão",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

const EMPTY_FORM: PayableInput = {
  description: "",
  supplier: "",
  category: "",
  value: 0,
  paidValue: 0,
  dueDate: null,
  competenceDate: null,
  paidAt: null,
  status: "pendente",
  paymentMethod: "",
  bankAccount: "",
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

export default function ContasPagar() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<FinanceStatus | "all">("all");
  const [totalEmAberto, setTotalEmAberto] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("dueDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("dueDate", "asc")],
    [statusFilter]
  );

  const {
    items: payables,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "payables",
    constraints,
    mapDoc: mapPayable,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshTotal = () => {
    getPayablesOpenTotal()
      .then(setTotalEmAberto)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshTotal();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PayableInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [installmentsEnabled, setInstallmentsEnabled] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installmentInterval, setInstallmentInterval] = useState(30);

  const [payableToDelete, setPayableToDelete] = useState<IPayable | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setInstallmentsEnabled(false);
    setInstallmentCount(2);
    setInstallmentInterval(30);
    setIsFormOpen(true);
  };

  const openEditForm = (payable: IPayable) => {
    setEditingId(payable.id);
    setForm({
      description: payable.description,
      supplier: payable.supplier,
      category: payable.category,
      value: payable.value,
      paidValue: payable.paidValue ?? 0,
      dueDate: payable.dueDate,
      competenceDate: payable.competenceDate,
      paidAt: payable.paidAt,
      status: payable.status,
      paymentMethod: payable.paymentMethod,
      bankAccount: payable.bankAccount,
      notes: payable.notes,
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
        await updatePayable(editingId, form);
        showToast("Conta atualizada com sucesso.", "success");
      } else {
        const owner = { uid: currentUser.uid, name: currentUser.displayName ?? currentUser.email };
        if (installmentsEnabled && installmentCount > 1) {
          await createPayableInstallments(form, owner, {
            count: installmentCount,
            intervalDays: installmentInterval,
          });
          showToast(`${installmentCount} parcelas cadastradas com sucesso.`, "success");
        } else {
          await createPayable(form, owner);
          showToast("Conta cadastrada com sucesso.", "success");
        }
      }
      refresh();
      refreshTotal();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar conta",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (payable: IPayable) => {
    try {
      await markPayablePaid(payable.id);
      showToast("Conta marcada como paga.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar conta",
        "error"
      );
    }
  };

  const handleDelete = async () => {
    if (!payableToDelete) return;
    try {
      await deletePayable(payableToDelete.id);
      showToast("Conta excluída.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir conta",
        "error"
      );
    } finally {
      setPayableToDelete(null);
    }
  };

  return (
    <div className="payables_page">
      <div className="payables_page__header">
        <h1>Contas a Pagar</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova conta
        </Button>
      </div>

      <div className="payables_page__summary">
        <span>Total em aberto</span>
        <strong>{currency.format(totalEmAberto)}</strong>
      </div>

      <div className="payables_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FinanceStatus | "all")}
        >
          <option value="all">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as FinanceStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="payables_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="payables_page__empty">Carregando contas...</p>
      ) : payables.length === 0 ? (
        <p className="payables_page__empty">Nenhuma conta encontrada.</p>
      ) : (
        <div className="payables_page__table_wrap">
          <table className="payables_page__table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Forma de pagamento</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payables.map((payable) => (
                <tr key={payable.id}>
                  <td>
                    {payable.description}
                    {payable.installmentTotal ? (
                      <span className="payables_page__installment_tag">
                        {" "}
                        {payable.installmentNumber}/{payable.installmentTotal}
                      </span>
                    ) : null}
                  </td>
                  <td>{payable.supplier || "—"}</td>
                  <td>{payable.category || "—"}</td>
                  <td>{currency.format(payable.value)}</td>
                  <td>{toDateInput(payable.dueDate) || "—"}</td>
                  <td>{payable.paymentMethod ? PAYMENT_METHOD_LABEL[payable.paymentMethod] : "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[payable.status]}>
                      {STATUS_LABEL[payable.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="payables_page__table__actions">
                      {payable.status !== "pago" && (
                        <Button variant="secondary" onClick={() => handleMarkPaid(payable)}>
                          Marcar pago
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => openEditForm(payable)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setPayableToDelete(payable)}>
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
        title={editingId ? "Editar conta a pagar" : "Nova conta a pagar"}
      >
        <form className="payables_page__form" onSubmit={handleSubmit}>
          <div className="payables_page__form__grid">
            <FormField label="Descrição*">
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <FormField label="Fornecedor">
              <input
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </FormField>
            <FormField label="Categoria">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </FormField>
            <FormField label="Valor (R$)*">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Vencimento">
              <input
                type="date"
                value={toDateInput(form.dueDate)}
                onChange={(e) =>
                  setForm({ ...form, dueDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Competência">
              <input
                type="date"
                value={toDateInput(form.competenceDate)}
                onChange={(e) =>
                  setForm({ ...form, competenceDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Forma de pagamento">
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    paymentMethod: e.target.value as PaymentMethod | "",
                  })
                }
              >
                <option value="">Não informado</option>
                {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABEL[method]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Conta bancária">
              <input
                placeholder="Ex.: Banco X, conta corrente 1234-5"
                value={form.bankAccount}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as FinanceStatus })
                }
              >
                {(Object.keys(STATUS_LABEL) as FinanceStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </FormField>
            {form.status === "parcialmente_pago" && (
              <FormField label="Valor já pago (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paidValue}
                  onChange={(e) => setForm({ ...form, paidValue: Number(e.target.value) })}
                />
              </FormField>
            )}
            {(form.status === "pago" || form.status === "estornado") && (
              <FormField label="Data de pagamento efetivo">
                <input
                  type="date"
                  value={toDateInput(form.paidAt)}
                  onChange={(e) =>
                    setForm({ ...form, paidAt: fromDateInput(e.target.value) })
                  }
                />
              </FormField>
            )}
          </div>

          {!editingId && (
            <div className="payables_page__installments">
              <label className="payables_page__installments__toggle">
                <input
                  type="checkbox"
                  checked={installmentsEnabled}
                  onChange={(e) => setInstallmentsEnabled(e.target.checked)}
                />
                Parcelar esta conta
              </label>
              {installmentsEnabled && (
                <div className="payables_page__installments__fields">
                  <FormField label="Nº de parcelas">
                    <input
                      type="number"
                      min="2"
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(Number(e.target.value))}
                    />
                  </FormField>
                  <FormField label="Intervalo entre parcelas (dias)">
                    <input
                      type="number"
                      min="1"
                      value={installmentInterval}
                      onChange={(e) => setInstallmentInterval(Number(e.target.value))}
                    />
                  </FormField>
                  <p className="payables_page__installments__hint">
                    O valor informado acima será dividido em {installmentCount}x, com
                    vencimentos a cada {installmentInterval} dias a partir do vencimento
                    informado.
                  </p>
                </div>
              )}
            </div>
          )}

          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="payables_page__form__actions">
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
        isOpen={!!payableToDelete}
        title="Excluir conta"
        message={`Excluir "${payableToDelete?.description}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPayableToDelete(null)}
      />
    </div>
  );
}
