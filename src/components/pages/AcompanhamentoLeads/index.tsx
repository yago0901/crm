import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../../../contexts/auth";
import { useToast } from "../../common/Toast";
import Button from "../../common/Button";
import ConfirmDialog from "../../common/ConfirmDialog";
import {
  addInteraction,
  subscribeToContacts,
  subscribeToInteractions,
  updateContactStatus,
  updateNextContact,
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

const formatRelative = (value: Timestamp | null) => {
  if (!value) return "sem registro";
  const diffMs = Date.now() - value.toDate().getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "há 1 dia";
  return `há ${diffDays} dias`;
};

const formatDateShort = (value: Timestamp | null) =>
  value ? value.toDate().toLocaleDateString("pt-BR") : "";

const isOverdue = (value: Timestamp | null) =>
  !!value && value.toDate().getTime() < Date.now();

const toDateInputValue = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

export default function AcompanhamentoLeads() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [leads, setLeads] = useState<IContact[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [interactions, setInteractions] = useState<IInteraction[]>([]);
  const [interactionType, setInteractionType] =
    useState<InteractionType>("nota");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingConvert, setConfirmingConvert] = useState(false);

  useEffect(() => {
    setLoadingLeads(true);
    const unsubscribe = subscribeToContacts(
      "lead",
      (data) => {
        setLeads(data);
        setLoadingLeads(false);
        setLoadError(null);
      },
      (err) => {
        setLoadError(err.message);
        setLoadingLeads(false);
      }
    );
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
    if (!contactId || !currentUser || !description.trim() || !selectedLead) return;

    setSaving(true);
    try {
      await addInteraction(
        contactId,
        selectedLead.name,
        { type: interactionType, description },
        { uid: currentUser.uid, name: currentUser.displayName ?? currentUser.email }
      );
      setDescription("");
      showToast("Interação registrada.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao registrar interação",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNextContactChange = async (value: string) => {
    if (!contactId) return;
    const date = value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;
    try {
      await updateNextContact(contactId, date);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar próximo contato",
        "error"
      );
    }
  };

  const handleConvert = async () => {
    if (!contactId) return;
    try {
      await updateContactStatus(contactId, "cliente");
      showToast("Lead convertido em cliente.", "success");
      navigate("/vendas-crm/acompanhamento-leads");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao converter lead",
        "error"
      );
    } finally {
      setConfirmingConvert(false);
    }
  };

  return (
    <div className="leads_page">
      <aside className="leads_page__list">
        <h1>Acompanhamento de Leads</h1>
        {loadError && <p className="leads_page__error">{loadError}</p>}
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
                  <span className="leads_page__list__meta">
                    Último: {formatRelative(lead.lastInteractionAt)}
                  </span>
                  <span
                    className={
                      isOverdue(lead.nextContactAt)
                        ? "leads_page__list__meta leads_page__list__meta--overdue"
                        : "leads_page__list__meta"
                    }
                  >
                    Próximo:{" "}
                    {lead.nextContactAt
                      ? formatDateShort(lead.nextContactAt)
                      : "sem previsão"}
                  </span>
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
              <Button variant="primary" onClick={() => setConfirmingConvert(true)}>
                Converter em cliente
              </Button>
            </div>

            <div className="leads_page__detail__followup">
              <div>
                <span>Último contato</span>
                <strong>{formatRelative(selectedLead.lastInteractionAt)}</strong>
              </div>
              <div>
                <span>Próximo contato previsto</span>
                <input
                  type="date"
                  value={toDateInputValue(selectedLead.nextContactAt)}
                  onChange={(e) => handleNextContactChange(e.target.value)}
                />
              </div>
            </div>

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
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Salvando..." : "Registrar"}
              </Button>
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

      <ConfirmDialog
        isOpen={confirmingConvert}
        title="Converter em cliente"
        message="Converter este lead em cliente? Ele sairá desta lista."
        confirmLabel="Converter"
        onConfirm={handleConvert}
        onCancel={() => setConfirmingConvert(false)}
      />
    </div>
  );
}
