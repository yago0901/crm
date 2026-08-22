import { FormEvent, useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../../../contexts/auth";
import { useToast } from "../../common/Toast";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Button from "../../common/Button";
import Badge from "../../common/Badge";
import FormField from "../../common/FormField";
import {
  createPayable,
  deletePayable,
  markPayablePaid,
  subscribeToPayables,
  updatePayable,
} from "../../../services/finance";
import { FinanceStatus, IPayable, PayableInput } from "../../../types/finance";
import "./styles.scss";

const STATUS_LABEL: Record<FinanceStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

const STATUS_TONE: Record<FinanceStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  pago: "success",
  atrasado: "danger",
};

const EMPTY_FORM: PayableInput = {
  description: "",
  supplier: "",
  category: "",
  value: 0,
  dueDate: null,
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

export default function ContasPagar() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [payables, setPayables] = useState<IPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<FinanceStatus | "all">("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PayableInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [payableToDelete, setPayableToDelete] = useState<IPayable | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPayables(
      statusFilter,
      (data) => {
        setPayables(data);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        setLoadError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [statusFilter]);

  const totalEmAberto = useMemo(
    () =>
      payables
        .filter((p) => p.status !== "pago")
        .reduce((sum, p) => sum + p.value, 0),
    [payables]
  );

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (payable: IPayable) => {
    setEditingId(payable.id);
    setForm({
      description: payable.description,
      supplier: payable.supplier,
      category: payable.category,
      value: payable.value,
      dueDate: payable.dueDate,
      status: payable.status,
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
        await createPayable(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Conta cadastrada com sucesso.", "success");
      }
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
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
          <option value="pago">Pago</option>
        </select>
      </div>

      {loadError && <p className="payables_page__error">{loadError}</p>}

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
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payables.map((payable) => (
                <tr key={payable.id}>
                  <td>{payable.description}</td>
                  <td>{payable.supplier || "—"}</td>
                  <td>{payable.category || "—"}</td>
                  <td>{currency.format(payable.value)}</td>
                  <td>{toDateInput(payable.dueDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[payable.status]}>
                      {STATUS_LABEL[payable.status]}
                    </Badge>
                  </td>
                  <td className="payables_page__table__actions">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as FinanceStatus })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
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
