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
  createLedgerEntry,
  deleteLedgerEntry,
  getLedgerBalance,
  mapLedgerEntry,
  updateLedgerEntry,
} from "../../../services/ledger";
import { ILedgerEntry, LedgerEntryInput, LedgerEntryType } from "../../../types/ledgerEntry";
import "./styles.scss";

const TYPE_LABEL: Record<LedgerEntryType, string> = {
  debito: "Débito",
  credito: "Crédito",
};

const TYPE_TONE: Record<LedgerEntryType, "danger" | "success"> = {
  debito: "danger",
  credito: "success",
};

const EMPTY_FORM: LedgerEntryInput = {
  description: "",
  category: "",
  type: "debito",
  value: 0,
  date: null,
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

export default function Contabilidade() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | "all">("all");
  const [balance, setBalance] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const constraints = useMemo(
    () =>
      typeFilter === "all"
        ? [orderBy("date", "desc")]
        : [where("type", "==", typeFilter), orderBy("date", "desc")],
    [typeFilter]
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
    collectionPath: "ledgerEntries",
    constraints,
    mapDoc: mapLedgerEntry,
    pageSize: PAGE_SIZE,
    resetKey: typeFilter,
  });

  const refreshBalance = () => {
    getLedgerBalance()
      .then(setBalance)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshBalance();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LedgerEntryInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [entryToDelete, setEntryToDelete] = useState<ILedgerEntry | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (entry: ILedgerEntry) => {
    setEditingId(entry.id);
    setForm({
      description: entry.description,
      category: entry.category,
      type: entry.type,
      value: entry.value,
      date: entry.date,
      notes: entry.notes,
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
        await updateLedgerEntry(editingId, form);
        showToast("Lançamento atualizado com sucesso.", "success");
      } else {
        await createLedgerEntry(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Lançamento criado com sucesso.", "success");
      }
      refresh();
      refreshBalance();
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

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteLedgerEntry(entryToDelete.id);
      showToast("Lançamento excluído.", "success");
      refresh();
      refreshBalance();
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
    <div className="ledger_page">
      <div className="ledger_page__header">
        <h1>Contabilidade</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo lançamento
        </Button>
      </div>

      <div
        className={`ledger_page__summary ${
          balance >= 0 ? "ledger_page__summary--positive" : "ledger_page__summary--negative"
        }`}
      >
        <span>Saldo contábil</span>
        <strong>{currency.format(balance)}</strong>
      </div>

      <div className="ledger_page__filters">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LedgerEntryType | "all")}
        >
          <option value="all">Todos os lançamentos</option>
          <option value="credito">Crédito</option>
          <option value="debito">Débito</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="ledger_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="ledger_page__empty">Carregando lançamentos...</p>
      ) : entries.length === 0 ? (
        <p className="ledger_page__empty">Nenhum lançamento contábil encontrado.</p>
      ) : (
        <div className="ledger_page__table_wrap">
          <table className="ledger_page__table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Data</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.description}</td>
                  <td>{entry.category || "—"}</td>
                  <td>
                    <Badge tone={TYPE_TONE[entry.type]}>{TYPE_LABEL[entry.type]}</Badge>
                  </td>
                  <td>{currency.format(entry.value)}</td>
                  <td>{toDateInput(entry.date) || "—"}</td>
                  <td>
                    <div className="ledger_page__table__actions">
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
        <form className="ledger_page__form" onSubmit={handleSubmit}>
          <div className="ledger_page__form__grid">
            <FormField label="Descrição*">
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <FormField label="Categoria">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </FormField>
            <FormField label="Tipo">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as LedgerEntryType })
                }
              >
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
              </select>
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
            <FormField label="Data">
              <input
                type="date"
                value={toDateInput(form.date)}
                onChange={(e) => setForm({ ...form, date: fromDateInput(e.target.value) })}
              />
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="ledger_page__form__actions">
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
        message={`Excluir "${entryToDelete?.description}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setEntryToDelete(null)}
      />
    </div>
  );
}
