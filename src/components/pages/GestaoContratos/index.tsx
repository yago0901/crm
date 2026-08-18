import { FormEvent, useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../../../contexts/auth";
import {
  createContract,
  deleteContract,
  subscribeToContracts,
  updateContract,
} from "../../../services/contracts";
import { fetchClientContacts } from "../../../services/contacts";
import { ContractInput, ContractStatus, IContract } from "../../../types/contract";
import { IContact } from "../../../types/contact";
import "./styles.scss";

const STATUS_LABEL: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

const EMPTY_FORM: ContractInput = {
  title: "",
  contactId: "",
  contactName: "",
  value: 0,
  status: "rascunho",
  startDate: null,
  endDate: null,
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

export default function GestaoContratos() {
  const { currentUser } = useAuth();

  const [contracts, setContracts] = useState<IContract[]>([]);
  const [clients, setClients] = useState<IContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToContracts(
      statusFilter,
      (data) => {
        setContracts(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [statusFilter]);

  useEffect(() => {
    fetchClientContacts()
      .then(setClients)
      .catch((err) => setError(err.message));
  }, []);

  const totalAtivo = useMemo(
    () =>
      contracts
        .filter((c) => c.status === "ativo")
        .reduce((sum, c) => sum + c.value, 0),
    [contracts]
  );

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (contract: IContract) => {
    setEditingId(contract.id);
    setForm({
      title: contract.title,
      contactId: contract.contactId,
      contactName: contract.contactName,
      value: contract.value,
      status: contract.status,
      startDate: contract.startDate,
      endDate: contract.endDate,
      notes: contract.notes,
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
    setForm({
      ...form,
      contactId,
      contactName: contact?.name ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.contactId) return;

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateContract(editingId, form);
      } else {
        await createContract(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar contrato");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contract: IContract) => {
    const confirmed = window.confirm(`Excluir o contrato "${contract.title}"?`);
    if (!confirmed) return;

    try {
      await deleteContract(contract.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir contrato");
    }
  };

  return (
    <div className="contracts_page">
      <div className="contracts_page__header">
        <h1>Gestão de Contratos</h1>
        <button className="contracts_page__header__new_btn" onClick={openCreateForm}>
          + Novo contrato
        </button>
      </div>

      <div className="contracts_page__summary">
        <span>Total em contratos ativos</span>
        <strong>{currency.format(totalAtivo)}</strong>
      </div>

      <div className="contracts_page__filters">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ContractStatus | "all")
          }
        >
          <option value="all">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="ativo">Ativo</option>
          <option value="encerrado">Encerrado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {error && <p className="contracts_page__error">{error}</p>}

      {isFormOpen && (
        <form className="contracts_page__form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Editar contrato" : "Novo contrato"}</h2>
          <div className="contracts_page__form__grid">
            <input
              required
              placeholder="Título*"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              required
              value={form.contactId}
              onChange={(e) => handleContactChange(e.target.value)}
            >
              <option value="">Selecione o cliente*</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor (R$)*"
              value={form.value}
              onChange={(e) =>
                setForm({ ...form, value: Number(e.target.value) })
              }
            />
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as ContractStatus })
              }
            >
              <option value="rascunho">Rascunho</option>
              <option value="ativo">Ativo</option>
              <option value="encerrado">Encerrado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <input
              type="date"
              value={toDateInput(form.startDate)}
              onChange={(e) =>
                setForm({ ...form, startDate: fromDateInput(e.target.value) })
              }
            />
            <input
              type="date"
              value={toDateInput(form.endDate)}
              onChange={(e) =>
                setForm({ ...form, endDate: fromDateInput(e.target.value) })
              }
            />
          </div>
          <textarea
            placeholder="Observações"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="contracts_page__form__actions">
            <button type="button" onClick={closeForm} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="contracts_page__empty">Carregando contratos...</p>
      ) : contracts.length === 0 ? (
        <p className="contracts_page__empty">
          Nenhum contrato encontrado. Cadastre clientes em Gestão de Contatos
          antes de criar um contrato.
        </p>
      ) : (
        <table className="contracts_page__table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Vigência</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td>{contract.title}</td>
                <td>{contract.contactName}</td>
                <td>{currency.format(contract.value)}</td>
                <td>
                  {toDateInput(contract.startDate) || "—"} a{" "}
                  {toDateInput(contract.endDate) || "—"}
                </td>
                <td>
                  <span
                    className={`contracts_page__badge contracts_page__badge--${contract.status}`}
                  >
                    {STATUS_LABEL[contract.status]}
                  </span>
                </td>
                <td className="contracts_page__table__actions">
                  <button onClick={() => openEditForm(contract)}>Editar</button>
                  <button onClick={() => handleDelete(contract)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
