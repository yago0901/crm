import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../../../contexts/auth";
import {
  addInteraction,
  subscribeToContacts,
  subscribeToInteractions,
  updateContactStatus,
} from "../../../services/contacts";
import {
  IContact,
  IInteraction,
  InteractionType,
} from "../../../types/contact";
import "./styles.scss";

const INTERACTION_LABEL: Record<InteractionType, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  nota: "Nota",
};

const formatDate = (value: Timestamp | null) =>
  value ? value.toDate().toLocaleString("pt-BR") : "agora há pouco";

export default function AcompanhamentoLeads() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [leads, setLeads] = useState<IContact[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const [interactions, setInteractions] = useState<IInteraction[]>([]);
  const [interactionType, setInteractionType] =
    useState<InteractionType>("nota");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingLeads(true);
    const unsubscribe = subscribeToContacts("lead", (data) => {
      setLeads(data);
      setLoadingLeads(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!contactId) {
      setInteractions([]);
      return;
    }
    const unsubscribe = subscribeToInteractions(contactId, setInteractions);
    return unsubscribe;
  }, [contactId]);

  const selectedLead = leads.find((lead) => lead.id === contactId) ?? null;

  const handleSelect = (id: string) => {
    navigate(`/vendas-crm/acompanhamento-leads/${id}`);
  };

  const handleAddInteraction = async (event: FormEvent) => {
    event.preventDefault();
    if (!contactId || !currentUser || !description.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await addInteraction(
        contactId,
        { type: interactionType, description },
        { uid: currentUser.uid, name: currentUser.displayName ?? currentUser.email }
      );
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar interação");
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!contactId) return;
    const confirmed = window.confirm(
      "Converter este lead em cliente? Ele sairá desta lista."
    );
    if (!confirmed) return;

    await updateContactStatus(contactId, "cliente");
    navigate("/vendas-crm/acompanhamento-leads");
  };

  return (
    <div className="leads_page">
      <aside className="leads_page__list">
        <h1>Acompanhamento de Leads</h1>
        {loadingLeads ? (
          <p className="leads_page__empty">Carregando leads...</p>
        ) : leads.length === 0 ? (
          <p className="leads_page__empty">
            Nenhum lead em aberto. Crie contatos com status "Lead" em Gestão
            de Contatos.
          </p>
        ) : (
          <ul>
            {leads.map((lead) => (
              <li key={lead.id}>
                <button
                  className={lead.id === contactId ? "selected" : ""}
                  onClick={() => handleSelect(lead.id)}
                >
                  <strong>{lead.name}</strong>
                  <span>{lead.company || lead.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="leads_page__detail">
        {!selectedLead ? (
          <p className="leads_page__empty">
            Selecione um lead na lista para ver o histórico.
          </p>
        ) : (
          <>
            <div className="leads_page__detail__header">
              <div>
                <h2>{selectedLead.name}</h2>
                <p>
                  {selectedLead.company && `${selectedLead.company} · `}
                  {selectedLead.email}
                  {selectedLead.phone && ` · ${selectedLead.phone}`}
                </p>
              </div>
              <button
                className="leads_page__detail__convert_btn"
                onClick={handleConvert}
              >
                Converter em cliente
              </button>
            </div>

            {error && <p className="leads_page__error">{error}</p>}

            <form
              className="leads_page__detail__form"
              onSubmit={handleAddInteraction}
            >
              <select
                value={interactionType}
                onChange={(e) =>
                  setInteractionType(e.target.value as InteractionType)
                }
              >
                <option value="nota">Nota</option>
                <option value="ligacao">Ligação</option>
                <option value="email">E-mail</option>
                <option value="reuniao">Reunião</option>
              </select>
              <input
                placeholder="Descreva a interação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Registrar"}
              </button>
            </form>

            <ul className="leads_page__timeline">
              {interactions.length === 0 && (
                <p className="leads_page__empty">
                  Nenhuma interação registrada ainda.
                </p>
              )}
              {interactions.map((interaction) => (
                <li key={interaction.id}>
                  <span className="leads_page__timeline__type">
                    {INTERACTION_LABEL[interaction.type]}
                  </span>
                  <p>{interaction.description}</p>
                  <span className="leads_page__timeline__meta">
                    {interaction.createdByName || "—"} ·{" "}
                    {formatDate(interaction.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
