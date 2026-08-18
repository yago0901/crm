import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/auth";
import { useToast } from "../../common/Toast";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Button from "../../common/Button";
import Badge from "../../common/Badge";
import FormField from "../../common/FormField";
import {
  createContact,
  deleteContact,
  subscribeToContacts,
  updateContact,
} from "../../../services/contacts";
import { ContactInput, ContactStatus, IContact } from "../../../types/contact";
import "./styles.scss";

const STATUS_LABEL: Record<ContactStatus, string> = {
  lead: "Lead",
  cliente: "Cliente",
  inativo: "Inativo",
};

const STATUS_TONE: Record<ContactStatus, "warning" | "success" | "neutral"> = {
  lead: "warning",
  cliente: "success",
  inativo: "neutral",
};

const EMPTY_FORM: ContactInput = {
  name: "",
  email: "",
  phone: "",
  company: "",
  role: "",
  status: "lead",
  tags: [],
  notes: "",
};

export default function GestaoContatos() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<IContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [search, setSearch] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [contactToDelete, setContactToDelete] = useState<IContact | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToContacts(
      statusFilter,
      (data) => {
        setContacts(data);
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

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) =>
      [c.name, c.email, c.company].some((field) =>
        field?.toLowerCase().includes(term)
      )
    );
  }, [contacts, search]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (contact: IContact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      role: contact.role,
      status: contact.status,
      tags: contact.tags,
      notes: contact.notes,
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
        await updateContact(editingId, form);
        showToast("Contato atualizado com sucesso.", "success");
      } else {
        await createContact(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Contato criado com sucesso.", "success");
      }
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar contato",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;
    try {
      await deleteContact(contactToDelete.id);
      showToast("Contato excluído.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir contato",
        "error"
      );
    } finally {
      setContactToDelete(null);
    }
  };

  return (
    <div className="contacts_page">
      <div className="contacts_page__header">
        <h1>Gestão de Contatos</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo contato
        </Button>
      </div>

      <div className="contacts_page__filters">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ContactStatus | "all")
          }
        >
          <option value="all">Todos os status</option>
          <option value="lead">Lead</option>
          <option value="cliente">Cliente</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {loadError && <p className="contacts_page__error">{loadError}</p>}

      {loading ? (
        <p className="contacts_page__empty">Carregando contatos...</p>
      ) : filteredContacts.length === 0 ? (
        <p className="contacts_page__empty">Nenhum contato encontrado.</p>
      ) : (
        <div className="contacts_page__table_wrap">
          <table className="contacts_page__table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <strong>{contact.name}</strong>
                    {contact.role && <span> · {contact.role}</span>}
                  </td>
                  <td>{contact.company || "—"}</td>
                  <td>
                    <div>{contact.email}</div>
                    {contact.phone && <div>{contact.phone}</div>}
                  </td>
                  <td>
                    <Badge tone={STATUS_TONE[contact.status]}>
                      {STATUS_LABEL[contact.status]}
                    </Badge>
                  </td>
                  <td className="contacts_page__table__actions">
                    <Button variant="secondary" onClick={() => openEditForm(contact)}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => setContactToDelete(contact)}>
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
        title={editingId ? "Editar contato" : "Novo contato"}
      >
        <form className="contacts_page__form" onSubmit={handleSubmit}>
          <div className="contacts_page__form__grid">
            <FormField label="Nome*">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="E-mail*">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
            <FormField label="Telefone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>
            <FormField label="Empresa">
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </FormField>
            <FormField label="Cargo">
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ContactStatus })
                }
              >
                <option value="lead">Lead</option>
                <option value="cliente">Cliente</option>
                <option value="inativo">Inativo</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="contacts_page__form__actions">
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
        isOpen={!!contactToDelete}
        title="Excluir contato"
        message={`Excluir "${contactToDelete?.name}"? Isso também apaga o histórico de interações.`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setContactToDelete(null)}
      />
    </div>
  );
}
