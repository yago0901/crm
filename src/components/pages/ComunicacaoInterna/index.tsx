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
  createAnnouncement,
  deleteAnnouncement,
  getDraftAnnouncementsCount,
  mapAnnouncement,
  publishAnnouncement,
  updateAnnouncement,
} from "../../../services/colaboracao/announcements";
import { AnnouncementInput, AnnouncementStatus, IAnnouncement } from "../../../types/announcement";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
};

const STATUS_TONE: Record<AnnouncementStatus, "neutral" | "success"> = {
  rascunho: "neutral",
  publicado: "success",
};

const EMPTY_FORM: AnnouncementInput = {
  title: "",
  body: "",
  audience: "Todos",
  status: "rascunho",
};

export default function ComunicacaoInterna() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [draftCount, setDraftCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: announcements,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "announcements",
    constraints,
    mapDoc: mapAnnouncement,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshDraftCount = () => {
    getDraftAnnouncementsCount()
      .then(setDraftCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshDraftCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [announcementToDelete, setAnnouncementToDelete] = useState<IAnnouncement | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (announcement: IAnnouncement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      status: announcement.status,
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
        await updateAnnouncement(editingId, form);
        showToast("Comunicado atualizado com sucesso.", "success");
      } else {
        await createAnnouncement(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Comunicado criado com sucesso.", "success");
      }
      refresh();
      refreshDraftCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar comunicado",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (announcement: IAnnouncement) => {
    try {
      await publishAnnouncement(announcement.id);
      showToast("Comunicado publicado.", "success");
      refresh();
      refreshDraftCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao publicar comunicado",
        "error"
      );
    }
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    try {
      await deleteAnnouncement(announcementToDelete.id);
      showToast("Comunicado excluído.", "success");
      refresh();
      refreshDraftCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir comunicado",
        "error"
      );
    } finally {
      setAnnouncementToDelete(null);
    }
  };

  return (
    <div className="announcements_page">
      <div className="announcements_page__header">
        <h1>Comunicação Interna</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo comunicado
        </Button>
      </div>

      <div className="announcements_page__summary">
        <span>Rascunhos</span>
        <strong>{draftCount}</strong>
      </div>

      <div className="announcements_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AnnouncementStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="publicado">Publicado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="announcements_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="announcements_page__empty">Carregando comunicados...</p>
      ) : announcements.length === 0 ? (
        <p className="announcements_page__empty">Nenhum comunicado encontrado.</p>
      ) : (
        <div className="announcements_page__table_wrap">
          <table className="announcements_page__table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Público</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {announcements.map((announcement) => (
                <tr key={announcement.id}>
                  <td>{announcement.title}</td>
                  <td>{announcement.audience || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[announcement.status]}>
                      {STATUS_LABEL[announcement.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="announcements_page__table__actions">
                      {announcement.status === "rascunho" && (
                        <Button variant="secondary" onClick={() => handlePublish(announcement)}>
                          Publicar
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => openEditForm(announcement)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setAnnouncementToDelete(announcement)}>
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
        title={editingId ? "Editar comunicado" : "Novo comunicado"}
      >
        <form className="announcements_page__form" onSubmit={handleSubmit}>
          <div className="announcements_page__form__grid">
            <FormField label="Título*">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </FormField>
            <FormField label="Público">
              <input
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as AnnouncementStatus })
                }
              >
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
              </select>
            </FormField>
          </div>
          <FormField label="Mensagem*">
            <textarea
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </FormField>
          <div className="announcements_page__form__actions">
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
        isOpen={!!announcementToDelete}
        title="Excluir comunicado"
        message={`Excluir "${announcementToDelete?.title}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setAnnouncementToDelete(null)}
      />
    </div>
  );
}
