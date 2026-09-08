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
  createDeal,
  deleteDeal,
  mapDeal,
  subscribeToDeals,
  updateDeal,
} from "../../../services/vendas-crm/deals";
import { fetchOpenContacts } from "../../../services/vendas-crm/contacts";
import {
  DealInput,
  DealStage,
  DealStatus,
  DEAL_STAGE_ORDER,
  IDeal,
} from "../../../types/deal";
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

const STAGE_LABEL: Record<DealStage, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  proposta: "Proposta Enviada",
  negociacao: "Negociação",
  fechamento: "Fechamento",
};

const EMPTY_FORM: DealInput = {
  contactId: "",
  contactName: "",
  title: "",
  estimatedValue: 0,
  status: "aberto",
  stage: "prospeccao",
  winProbability: 0,
  expectedCloseDate: null,
  lostReason: "",
  competitor: "",
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

export default function Negocios() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [view, setView] = useState<"funil" | "lista">("funil");

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

  const [openDeals, setOpenDeals] = useState<IDeal[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);

  useEffect(() => {
    setBoardLoading(true);
    const unsubscribe = subscribeToDeals(
      "aberto",
      (items) => {
        setOpenDeals(items);
        setBoardLoading(false);
      },
      (err) => {
        setLoadError(err.message);
        setBoardLoading(false);
      }
    );
    return unsubscribe;
  }, []);

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
      stage: deal.stage,
      winProbability: deal.winProbability,
      expectedCloseDate: deal.expectedCloseDate,
      lostReason: deal.lostReason,
      competitor: deal.competitor,
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

  const handleAdvanceStage = async (deal: IDeal) => {
    const currentIndex = DEAL_STAGE_ORDER.indexOf(deal.stage);
    const nextStage = DEAL_STAGE_ORDER[currentIndex + 1];
    if (!nextStage) return;

    try {
      await updateDeal(deal.id, { stage: nextStage });
      showToast(`Negócio avançado para "${STAGE_LABEL[nextStage]}".`, "success");
      refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao avançar etapa",
        "error"
      );
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

      <div className="deals_page__view_toggle">
        <Button
          variant={view === "funil" ? "primary" : "secondary"}
          onClick={() => setView("funil")}
        >
          Funil
        </Button>
        <Button
          variant={view === "lista" ? "primary" : "secondary"}
          onClick={() => setView("lista")}
        >
          Lista
        </Button>
      </div>

      {loadError && <p className="deals_page__error">{loadError}</p>}

      {view === "funil" ? (
        boardLoading ? (
          <p className="deals_page__empty">Carregando funil...</p>
        ) : openDeals.length === 0 ? (
          <p className="deals_page__empty">
            Nenhum negócio em aberto. Cadastre contatos em Gestão de Contatos antes de criar
            um negócio.
          </p>
        ) : (
          <div className="deals_page__board">
            {DEAL_STAGE_ORDER.map((stage) => {
              const stageDeals = openDeals.filter((deal) => deal.stage === stage);
              const stageTotal = stageDeals.reduce((sum, deal) => sum + deal.estimatedValue, 0);
              const nextStage = DEAL_STAGE_ORDER[DEAL_STAGE_ORDER.indexOf(stage) + 1];

              return (
                <div key={stage} className="deals_page__board__column">
                  <div className="deals_page__board__column__header">
                    <span>{STAGE_LABEL[stage]}</span>
                    <span className="deals_page__board__column__header__count">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="deals_page__board__column__total">
                    {currency.format(stageTotal)}
                  </div>
                  <div className="deals_page__board__column__cards">
                    {stageDeals.map((deal) => (
                      <div key={deal.id} className="deals_page__card">
                        <strong>{deal.title}</strong>
                        <span>{deal.contactName}</span>
                        <span>{currency.format(deal.estimatedValue)}</span>
                        <span>{deal.winProbability}% de chance</span>
                        <div className="deals_page__card__actions">
                          <Button variant="secondary" onClick={() => openEditForm(deal)}>
                            Editar
                          </Button>
                          {nextStage && (
                            <Button variant="primary" onClick={() => handleAdvanceStage(deal)}>
                              Avançar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
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

          {pageError && <p className="deals_page__error">{pageError}</p>}

          {loading ? (
            <p className="deals_page__empty">Carregando negócios...</p>
          ) : deals.length === 0 ? (
            <p className="deals_page__empty">Nenhum negócio encontrado.</p>
          ) : (
            <div className="deals_page__table_wrap">
              <table className="deals_page__table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Contato</th>
                    <th>Etapa</th>
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
                      <td>{STAGE_LABEL[deal.stage]}</td>
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
        </>
      )}

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
            <FormField label="Etapa do funil">
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}
              >
                {DEAL_STAGE_ORDER.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABEL[stage]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Probabilidade de fechamento (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.winProbability}
                onChange={(e) => setForm({ ...form, winProbability: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Previsão de fechamento">
              <input
                type="date"
                value={toDateInput(form.expectedCloseDate)}
                onChange={(e) =>
                  setForm({ ...form, expectedCloseDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Concorrente (opcional)">
              <input
                value={form.competitor}
                onChange={(e) => setForm({ ...form, competitor: e.target.value })}
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
            {form.status === "perdido" && (
              <FormField label="Motivo da perda">
                <input
                  value={form.lostReason}
                  onChange={(e) => setForm({ ...form, lostReason: e.target.value })}
                />
              </FormField>
            )}
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
