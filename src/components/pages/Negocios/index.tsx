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
  createDeal,
  deleteDeal,
  mapDeal,
  updateDeal,
} from "../../../services/vendas-crm/deals";
import { fetchOpenContacts } from "../../../services/vendas-crm/contacts";
import { DealInput, DealStatus, IDeal } from "../../../types/deal";
import { IContact } from "../../../types/contact";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<DealStatus, string> = {
  aberto: "Aberto",
  ganho: "Ganho",
  perdido: "Perdido",
};

const STATUS_TONE: Record<DealStatus, "info" | "success" | "danger"> = {
  aberto: "info",
  ganho: "success",
  perdido: "danger",
};

const EMPTY_FORM: DealInput = {
  contactId: "",
  contactName: "",
  title: "",
  estimatedValue: 0,
  status: "aberto",
  notes: "",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function Negocios() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<IContact[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: deals,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "deals",
    constraints,
    mapDoc: mapDeal,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  useEffect(() => {
    fetchOpenContacts()
      .then(setContacts)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DealInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [dealToDelete, setDealToDelete] = useState<IDeal | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (deal: IDeal) => {
    setEditingId(deal.id);
    setForm({
      contactId: deal.contactId,
      contactName: deal.contactName,
      title: deal.title,
      estimatedValue: deal.estimatedValue,
      status: deal.status,
      notes: deal.notes,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleContactChange = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
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
        await updateDeal(editingId, form);
        showToast("Negócio atualizado com sucesso.", "success");
      } else {
        await createDeal(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Negócio cadastrado com sucesso.", "success");
      }
      refresh();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar negócio",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dealToDelete) return;
    try {
      await deleteDeal(dealToDelete.id);
      showToast("Negócio excluído.", "success");
      refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir negócio",
        "error"
      );
    } finally {
      setDealToDelete(null);
    }
  };

  return (
    <div className="deals_page">
      <div className="deals_page__header">
        <h1>Negócios</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo negócio
        </Button>
      </div>

      <div className="deals_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DealStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="aberto">Aberto</option>
          <option value="ganho">Ganho</option>
          <option value="perdido">Perdido</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="deals_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="deals_page__empty">Carregando negócios...</p>
      ) : deals.length === 0 ? (
        <p className="deals_page__empty">
          Nenhum negócio encontrado. Cadastre contatos em Gestão de Contatos
          antes de criar um negócio.
        </p>
      ) : (
        <div className="deals_page__table_wrap">
          <table className="deals_page__table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Contato</th>
                <th>Valor estimado</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>{deal.title}</td>
                  <td>{deal.contactName}</td>
                  <td>{currency.format(deal.estimatedValue)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[deal.status]}>
                      {STATUS_LABEL[deal.status]}
                    </Badge>
                    {deal.convertedToContractId && (
                      <Badge tone="neutral">Convertido em contrato</Badge>
                    )}
                  </td>
                  <td>
                    <div className="deals_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(deal)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setDealToDelete(deal)}>
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
        title={editingId ? "Editar negócio" : "Novo negócio"}
      >
        <form className="deals_page__form" onSubmit={handleSubmit}>
          <div className="deals_page__form__grid">
            <FormField label="Contato*">
              <select
                required
                value={form.contactId}
                onChange={(e) => handleContactChange(e.target.value)}
              >
                <option value="">Selecione o contato</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Produto/serviço*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </FormField>
            <FormField label="Valor estimado (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as DealStatus })}
              >
                <option value="aberto">Aberto</option>
                <option value="ganho">Ganho</option>
                <option value="perdido">Perdido</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="deals_page__form__actions">
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
        isOpen={!!dealToDelete}
        title="Excluir negócio"
        message={`Excluir "${dealToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDealToDelete(null)}
      />
    </div>
  );
}
