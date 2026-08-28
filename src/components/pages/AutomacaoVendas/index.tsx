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
  createFollowUp,
  deleteFollowUp,
  getPendingFollowUpsCount,
  mapFollowUp,
  markFollowUpDone,
  updateFollowUp,
} from "../../../services/vendas-crm/followUps";
import { searchContacts } from "../../../services/vendas-crm/contacts";
import { FollowUpInput, FollowUpStatus, IFollowUp } from "../../../types/followUp";
import { IContact } from "../../../types/contact";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<FollowUpStatus, string> = {
  pendente: "Pendente",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<FollowUpStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  concluido: "success",
  cancelado: "danger",
};

const EMPTY_FORM: FollowUpInput = {
  title: "",
  description: "",
  contactId: "",
  contactName: "",
  dueDate: null,
  status: "pendente",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function AutomacaoVendas() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<IContact[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("dueDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("dueDate", "asc")],
    [statusFilter]
  );

  const {
    items: followUps,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "followUps",
    constraints,
    mapDoc: mapFollowUp,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FollowUpInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [followUpToDelete, setFollowUpToDelete] = useState<IFollowUp | null>(null);

  const refreshPendingCount = () => {
    getPendingFollowUpsCount()
      .then(setPendingCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshPendingCount();
  }, []);

  useEffect(() => {
    searchContacts("all", "")
      .then(setContacts)
      .catch((err) => setLoadError(err.message));
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (followUp: IFollowUp) => {
    setEditingId(followUp.id);
    setForm({
      title: followUp.title,
      description: followUp.description,
      contactId: followUp.contactId,
      contactName: followUp.contactName,
      dueDate: followUp.dueDate,
      status: followUp.status,
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
    if (!currentUser) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateFollowUp(editingId, form);
        showToast("Lembrete atualizado com sucesso.", "success");
      } else {
        await createFollowUp(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Lembrete criado com sucesso.", "success");
      }
      refresh();
      refreshPendingCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar lembrete",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async (followUp: IFollowUp) => {
    try {
      await markFollowUpDone(followUp.id);
      showToast("Lembrete concluído.", "success");
      refresh();
      refreshPendingCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar lembrete",
        "error"
      );
    }
  };

  const handleDelete = async () => {
    if (!followUpToDelete) return;
    try {
      await deleteFollowUp(followUpToDelete.id);
      showToast("Lembrete excluído.", "success");
      refresh();
      refreshPendingCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir lembrete",
        "error"
      );
    } finally {
      setFollowUpToDelete(null);
    }
  };

  return (
    <div className="followups_page">
      <div className="followups_page__header">
        <h1>Automação de Vendas</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo lembrete
        </Button>
      </div>

      <div className="followups_page__summary">
        <span>Lembretes pendentes</span>
        <strong>{pendingCount}</strong>
      </div>

      <div className="followups_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FollowUpStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="followups_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="followups_page__empty">Carregando lembretes...</p>
      ) : followUps.length === 0 ? (
        <p className="followups_page__empty">
          Nenhum lembrete encontrado. Crie um lembrete de follow-up pra não
          perder o próximo contato com um lead ou cliente.
        </p>
      ) : (
        <div className="followups_page__table_wrap">
          <table className="followups_page__table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Contato</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {followUps.map((followUp) => (
                <tr key={followUp.id}>
                  <td>{followUp.title}</td>
                  <td>{followUp.contactName || "—"}</td>
                  <td>{toDateInput(followUp.dueDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[followUp.status]}>
                      {STATUS_LABEL[followUp.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="followups_page__table__actions">
                      {followUp.status === "pendente" && (
                        <Button variant="secondary" onClick={() => handleMarkDone(followUp)}>
                          Concluir
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => openEditForm(followUp)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setFollowUpToDelete(followUp)}>
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
        title={editingId ? "Editar lembrete" : "Novo lembrete"}
      >
        <form className="followups_page__form" onSubmit={handleSubmit}>
          <div className="followups_page__form__grid">
            <FormField label="Tarefa*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </FormField>
            <FormField label="Contato">
              <select
                value={form.contactId}
                onChange={(e) => handleContactChange(e.target.value)}
              >
                <option value="">Sem contato vinculado</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
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
                  setForm({ ...form, status: e.target.value as FollowUpStatus })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormField>
          </div>
          <FormField label="Descrição">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <div className="followups_page__form__actions">
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
        isOpen={!!followUpToDelete}
        title="Excluir lembrete"
        message={`Excluir o lembrete "${followUpToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setFollowUpToDelete(null)}
      />
    </div>
  );
}
