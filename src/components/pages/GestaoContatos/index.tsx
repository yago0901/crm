import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/auth";
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

  const [contacts, setContacts] = useState<IContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [search, setSearch] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToContacts(
      statusFilter,
      (data) => {
        setContacts(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe; // limpa o listener ao trocar o filtro / desmontar a página
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
    setError(null);
    try {
      if (editingId) {
        await updateContact(editingId, form);
      } else {
        await createContact(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar contato");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contact: IContact) => {
    const confirmed = window.confirm(
      `Excluir "${contact.name}"? Isso também apaga o histórico de interações.`
    );
    if (!confirmed) return;

    try {
      await deleteContact(contact.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir contato");
    }
  };

  return (
    <div className="contacts_page">
      <div className="contacts_page__header">
        <h1>Gestão de Contatos</h1>
        <button
          className="contacts_page__header__new_btn"
          onClick={openCreateForm}
        >
          + Novo contato
        </button>
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

      {error && <p className="contacts_page__error">{error}</p>}

      {isFormOpen && (
        <form className="contacts_page__form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Editar contato" : "Novo contato"}</h2>
          <div className="contacts_page__form__grid">
            <input
              required
              placeholder="Nome*"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              required
              type="email"
              placeholder="E-mail*"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              placeholder="Telefone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              placeholder="Empresa"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <input
              placeholder="Cargo"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
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
          </div>
          <textarea
            placeholder="Observações"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="contacts_page__form__actions">
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
        <p className="contacts_page__empty">Carregando contatos...</p>
      ) : filteredContacts.length === 0 ? (
        <p className="contacts_page__empty">Nenhum contato encontrado.</p>
      ) : (
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
                  <span
                    className={`contacts_page__badge contacts_page__badge--${contact.status}`}
                  >
                    {STATUS_LABEL[contact.status]}
                  </span>
                </td>
                <td className="contacts_page__table__actions">
                  <button onClick={() => openEditForm(contact)}>Editar</button>
                  <button onClick={() => handleDelete(contact)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
