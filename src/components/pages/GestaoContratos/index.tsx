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
  createContract,
  deleteContract,
  getActiveContractsTotal,
  mapContract,
  updateContract,
} from "../../../services/vendas-crm/contracts";
import { fetchClientContacts } from "../../../services/vendas-crm/contacts";
import { ContractInput, ContractStatus, IContract } from "../../../types/contract";
import { IContact } from "../../../types/contact";
import "./styles.scss";

const STATUS_LABEL: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<ContractStatus, "neutral" | "success" | "info" | "danger"> = {
  rascunho: "neutral",
  ativo: "success",
  encerrado: "info",
  cancelado: "danger",
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

const PAGE_SIZE = 10;

export default function GestaoContratos() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [clients, setClients] = useState<IContact[]>([]);
  const [totalAtivo, setTotalAtivo] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: contracts,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "contracts",
    constraints,
    mapDoc: mapContract,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [contractToDelete, setContractToDelete] = useState<IContract | null>(null);

  const refreshTotal = () => {
    getActiveContractsTotal()
      .then(setTotalAtivo)
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
    try {
      if (editingId) {
        await updateContract(editingId, form);
        showToast("Contrato atualizado com sucesso.", "success");
      } else {
        await createContract(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Contrato criado com sucesso.", "success");
      }
      refresh();
      refreshTotal();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar contrato",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contractToDelete) return;
    try {
      await deleteContract(contractToDelete.id);
      showToast("Contrato excluído.", "success");
      refresh();
      refreshTotal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir contrato",
        "error"
      );
    } finally {
      setContractToDelete(null);
    }
  };

  return (
    <div className="contracts_page">
      <div className="contracts_page__header">
        <h1>Gestão de Contratos</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo contrato
        </Button>
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

      {(loadError || pageError) && (
        <p className="contracts_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="contracts_page__empty">Carregando contratos...</p>
      ) : contracts.length === 0 ? (
        <p className="contracts_page__empty">
          Nenhum contrato encontrado. Cadastre clientes em Gestão de Contatos
          antes de criar um contrato.
        </p>
      ) : (
        <div className="contracts_page__table_wrap">
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
                    <Badge tone={STATUS_TONE[contract.status]}>
                      {STATUS_LABEL[contract.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="contracts_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(contract)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setContractToDelete(contract)}>
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
        title={editingId ? "Editar contrato" : "Novo contrato"}
      >
        <form className="contracts_page__form" onSubmit={handleSubmit}>
          <div className="contracts_page__form__grid">
            <FormField label="Título*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
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
            <FormField label="Valor (R$)*">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) =>
                  setForm({ ...form, value: Number(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Status">
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
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="contracts_page__form__actions">
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
        isOpen={!!contractToDelete}
        title="Excluir contrato"
        message={`Excluir o contrato "${contractToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setContractToDelete(null)}
      />
    </div>
  );
}
