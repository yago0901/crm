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
  createReceivable,
  deleteReceivable,
  getReceivablesOpenTotal,
  mapReceivable,
  markReceivableReceived,
  updateReceivable,
} from "../../../services/financeiro/finance";
import { fetchClientContacts } from "../../../services/vendas-crm/contacts";
import { FinanceStatus, IReceivable, ReceivableInput } from "../../../types/finance";
import { IContact } from "../../../types/contact";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<FinanceStatus, string> = {
  pendente: "Pendente",
  pago: "Recebido",
  atrasado: "Atrasado",
};

const STATUS_TONE: Record<FinanceStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  pago: "success",
  atrasado: "danger",
};

const EMPTY_FORM: ReceivableInput = {
  description: "",
  contactId: "",
  contactName: "",
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

export default function ContasReceber() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [clients, setClients] = useState<IContact[]>([]);
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
    items: receivables,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "receivables",
    constraints,
    mapDoc: mapReceivable,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshTotal = () => {
    getReceivablesOpenTotal()
      .then(setTotalEmAberto)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshTotal();
  }, []);

  useEffect(() => {
    fetchClientContacts()
      .then(setClients)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReceivableInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [receivableToDelete, setReceivableToDelete] = useState<IReceivable | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (receivable: IReceivable) => {
    setEditingId(receivable.id);
    setForm({
      description: receivable.description,
      contactId: receivable.contactId,
      contactName: receivable.contactName,
      category: receivable.category,
      value: receivable.value,
      dueDate: receivable.dueDate,
      status: receivable.status,
      notes: receivable.notes,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleContactChange = (contactId: string) => {
    const contact = clients.find((c) => c.id === contactId);
    setForm({ ...form, contactId, contactName: contact?.name ?? "" });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.contactId) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateReceivable(editingId, form);
        showToast("Conta atualizada com sucesso.", "success");
      } else {
        await createReceivable(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Conta cadastrada com sucesso.", "success");
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

  const handleMarkReceived = async (receivable: IReceivable) => {
    try {
      await markReceivableReceived(receivable.id);
      showToast("Conta marcada como recebida.", "success");
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
    if (!receivableToDelete) return;
    try {
      await deleteReceivable(receivableToDelete.id);
      showToast("Conta excluída.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir conta",
        "error"
      );
    } finally {
      setReceivableToDelete(null);
    }
  };

  return (
    <div className="receivables_page">
      <div className="receivables_page__header">
        <h1>Contas a Receber</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova conta
        </Button>
      </div>

      <div className="receivables_page__summary">
        <span>Total em aberto</span>
        <strong>{currency.format(totalEmAberto)}</strong>
      </div>

      <div className="receivables_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FinanceStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
          <option value="pago">Recebido</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="receivables_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="receivables_page__empty">Carregando contas...</p>
      ) : receivables.length === 0 ? (
        <p className="receivables_page__empty">
          Nenhuma conta encontrada. Cadastre clientes em Gestão de Contatos
          antes de criar uma conta a receber.
        </p>
      ) : (
        <div className="receivables_page__table_wrap">
          <table className="receivables_page__table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {receivables.map((receivable) => (
                <tr key={receivable.id}>
                  <td>{receivable.description}</td>
                  <td>{receivable.contactName}</td>
                  <td>{receivable.category || "—"}</td>
                  <td>{currency.format(receivable.value)}</td>
                  <td>{toDateInput(receivable.dueDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[receivable.status]}>
                      {STATUS_LABEL[receivable.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="receivables_page__table__actions">
                      {receivable.status !== "pago" && (
                        <Button
                          variant="secondary"
                          onClick={() => handleMarkReceived(receivable)}
                        >
                          Marcar recebido
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => openEditForm(receivable)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setReceivableToDelete(receivable)}>
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
        title={editingId ? "Editar conta a receber" : "Nova conta a receber"}
      >
        <form className="receivables_page__form" onSubmit={handleSubmit}>
          <div className="receivables_page__form__grid">
            <FormField label="Descrição*">
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <FormField label="Cliente*">
              <select
                required
                value={form.contactId}
                onChange={(e) => handleContactChange(e.target.value)}
              >
                <option value="">Selecione o cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
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
                <option value="pago">Recebido</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="receivables_page__form__actions">
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
        isOpen={!!receivableToDelete}
        title="Excluir conta"
        message={`Excluir "${receivableToDelete?.description}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setReceivableToDelete(null)}
      />
    </div>
  );
}
