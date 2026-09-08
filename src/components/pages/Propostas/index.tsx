import { FormEvent, useEffect, useMemo, useState } from "react";
import { Timestamp, orderBy, where } from "firebase/firestore";
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
  createProposal,
  deleteProposal,
  mapProposal,
  updateProposal,
} from "../../../services/vendas-crm/proposals";
import { fetchOpenContacts } from "../../../services/vendas-crm/contacts";
import { fetchOpenOrWonDeals } from "../../../services/vendas-crm/deals";
import { fetchActiveProducts } from "../../../services/shared/products";
import { IProposal, IProposalItem, ProposalInput, ProposalStatus } from "../../../types/proposal";
import { IContact } from "../../../types/contact";
import { IDeal } from "../../../types/deal";
import { IProduct } from "../../../types/product";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

const STATUS_TONE: Record<ProposalStatus, "neutral" | "info" | "success" | "danger"> = {
  rascunho: "neutral",
  enviada: "info",
  aceita: "success",
  recusada: "danger",
  expirada: "danger",
};

const EMPTY_FORM: ProposalInput = {
  contactId: "",
  contactName: "",
  dealId: "",
  dealTitle: "",
  items: [],
  total: 0,
  validUntil: null,
  status: "rascunho",
  notes: "",
};

const EMPTY_ITEM_DRAFT = { productId: "", quantity: 1, unitPrice: 0 };

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

const computeTotal = (items: IProposalItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

const isPastValidity = (proposal: IProposal): boolean =>
  proposal.status === "enviada" &&
  !!proposal.validUntil &&
  proposal.validUntil.toDate().getTime() < Date.now();

export default function Propostas() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<IContact[]>([]);
  const [deals, setDeals] = useState<IDeal[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: proposals,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "proposals",
    constraints,
    mapDoc: mapProposal,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  useEffect(() => {
    fetchOpenContacts()
      .then(setContacts)
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    fetchOpenOrWonDeals()
      .then(setDeals)
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    fetchActiveProducts()
      .then(setProducts)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProposalInput>(EMPTY_FORM);
  const [itemDraft, setItemDraft] = useState(EMPTY_ITEM_DRAFT);
  const [saving, setSaving] = useState(false);

  const [proposalToDelete, setProposalToDelete] = useState<IProposal | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setItemDraft(EMPTY_ITEM_DRAFT);
    setIsFormOpen(true);
  };

  const openEditForm = (proposal: IProposal) => {
    setEditingId(proposal.id);
    setForm({
      contactId: proposal.contactId,
      contactName: proposal.contactName,
      dealId: proposal.dealId ?? "",
      dealTitle: proposal.dealTitle ?? "",
      items: proposal.items,
      total: proposal.total,
      validUntil: proposal.validUntil,
      status: proposal.status,
      notes: proposal.notes,
    });
    setItemDraft(EMPTY_ITEM_DRAFT);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setItemDraft(EMPTY_ITEM_DRAFT);
  };

  const handleContactChange = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    setForm({ ...form, contactId, contactName: contact?.name ?? "" });
  };

  const handleDealChange = (dealId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    setForm({
      ...form,
      dealId,
      dealTitle: deal?.title ?? "",
      ...(deal ? { contactId: deal.contactId, contactName: deal.contactName } : {}),
    });
  };

  const handleItemProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItemDraft({
      ...itemDraft,
      productId,
      unitPrice: product?.salePrice ?? 0,
    });
  };

  const handleAddItem = () => {
    const product = products.find((p) => p.id === itemDraft.productId);
    if (!product || itemDraft.quantity <= 0) return;

    const newItem: IProposalItem = {
      productId: product.id,
      productName: product.name,
      quantity: itemDraft.quantity,
      unitPrice: itemDraft.unitPrice,
    };
    const items = [...form.items, newItem];
    setForm({ ...form, items, total: computeTotal(items) });
    setItemDraft(EMPTY_ITEM_DRAFT);
  };

  const handleRemoveItem = (index: number) => {
    const items = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items, total: computeTotal(items) });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.contactId) return;
    if (form.items.length === 0) {
      showToast("Adicione ao menos um item à proposta.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateProposal(editingId, form);
        showToast("Proposta atualizada com sucesso.", "success");
      } else {
        await createProposal(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Proposta criada com sucesso.", "success");
      }
      refresh();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar proposta",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!proposalToDelete) return;
    try {
      await deleteProposal(proposalToDelete.id);
      showToast("Proposta excluída.", "success");
      refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir proposta",
        "error"
      );
    } finally {
      setProposalToDelete(null);
    }
  };

  return (
    <div className="proposals_page">
      <div className="proposals_page__header">
        <h1>Propostas</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova proposta
        </Button>
      </div>

      <div className="proposals_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProposalStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="enviada">Enviada</option>
          <option value="aceita">Aceita</option>
          <option value="recusada">Recusada</option>
          <option value="expirada">Expirada</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="proposals_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="proposals_page__empty">Carregando propostas...</p>
      ) : proposals.length === 0 ? (
        <p className="proposals_page__empty">
          Nenhuma proposta encontrada. Cadastre contatos em Gestão de Contatos antes de criar
          uma proposta.
        </p>
      ) : (
        <div className="proposals_page__table_wrap">
          <table className="proposals_page__table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Validade</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td>{proposal.contactName}</td>
                  <td>{proposal.items.length}</td>
                  <td>{currency.format(proposal.total)}</td>
                  <td>{toDateInput(proposal.validUntil) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[proposal.status]}>
                      {STATUS_LABEL[proposal.status]}
                    </Badge>
                    {isPastValidity(proposal) && <Badge tone="danger">Prazo vencido</Badge>}
                  </td>
                  <td>
                    <div className="proposals_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(proposal)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setProposalToDelete(proposal)}>
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
        title={editingId ? "Editar proposta" : "Nova proposta"}
      >
        <form className="proposals_page__form" onSubmit={handleSubmit}>
          <div className="proposals_page__form__grid">
            <FormField label="Negócio vinculado (opcional)">
              <select value={form.dealId} onChange={(e) => handleDealChange(e.target.value)}>
                <option value="">Nenhum</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title} — {deal.contactName}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Cliente*">
              <select
                required
                value={form.contactId}
                onChange={(e) => handleContactChange(e.target.value)}
              >
                <option value="">Selecione o cliente</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Validade">
              <input
                type="date"
                value={toDateInput(form.validUntil)}
                onChange={(e) => setForm({ ...form, validUntil: fromDateInput(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProposalStatus })}
              >
                <option value="rascunho">Rascunho</option>
                <option value="enviada">Enviada</option>
                <option value="aceita">Aceita</option>
                <option value="recusada">Recusada</option>
                <option value="expirada">Expirada</option>
              </select>
            </FormField>
          </div>

          <div className="proposals_page__items">
            <span className="proposals_page__items__label">Itens*</span>

            {form.items.length > 0 && (
              <table className="proposals_page__items__table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Preço unit.</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={`${item.productId}-${index}`}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{currency.format(item.unitPrice)}</td>
                      <td>{currency.format(item.quantity * item.unitPrice)}</td>
                      <td>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleRemoveItem(index)}
                        >
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="proposals_page__items__add">
              <select
                value={itemDraft.productId}
                onChange={(e) => handleItemProductChange(e.target.value)}
              >
                <option value="">Selecione um produto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                value={itemDraft.quantity}
                onChange={(e) =>
                  setItemDraft({ ...itemDraft, quantity: Number(e.target.value) })
                }
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemDraft.unitPrice}
                onChange={(e) =>
                  setItemDraft({ ...itemDraft, unitPrice: Number(e.target.value) })
                }
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItem}
                disabled={!itemDraft.productId}
              >
                + Adicionar item
              </Button>
            </div>

            <p className="proposals_page__items__total">
              Total: <strong>{currency.format(form.total)}</strong>
            </p>
          </div>

          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="proposals_page__form__actions">
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
        isOpen={!!proposalToDelete}
        title="Excluir proposta"
        message={`Excluir a proposta de "${proposalToDelete?.contactName}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setProposalToDelete(null)}
      />
    </div>
  );
}
