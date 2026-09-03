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
  createPerformanceReview,
  deletePerformanceReview,
  mapPerformanceReview,
  updatePerformanceReview,
} from "../../../services/rh/performanceReviews";
import { fetchActiveEmployees } from "../../../services/rh/employees";
import {
  IPerformanceReview,
  PerformanceReviewInput,
  PerformanceReviewStatus,
} from "../../../types/performanceReview";
import { IEmployee } from "../../../types/employee";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<PerformanceReviewStatus, string> = {
  rascunho: "Rascunho",
  finalizada: "Finalizada",
};

const STATUS_TONE: Record<PerformanceReviewStatus, "neutral" | "success"> = {
  rascunho: "neutral",
  finalizada: "success",
};

const EMPTY_FORM: PerformanceReviewInput = {
  employeeId: "",
  employeeName: "",
  period: "",
  score: 3,
  strengths: "",
  improvements: "",
  status: "rascunho",
};

export default function AvaliacaoDesempenho() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<PerformanceReviewStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: reviews,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "performanceReviews",
    constraints,
    mapDoc: mapPerformanceReview,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  useEffect(() => {
    fetchActiveEmployees()
      .then(setEmployees)
      .catch((err) => setLoadError(err.message));
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PerformanceReviewInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [reviewToDelete, setReviewToDelete] = useState<IPerformanceReview | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (review: IPerformanceReview) => {
    setEditingId(review.id);
    setForm({
      employeeId: review.employeeId,
      employeeName: review.employeeName,
      period: review.period,
      score: review.score,
      strengths: review.strengths,
      improvements: review.improvements,
      status: review.status,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setForm({
      ...form,
      employeeId,
      employeeName: employee?.name ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.employeeId) return;

    setSaving(true);
    try {
      if (editingId) {
        await updatePerformanceReview(editingId, form);
        showToast("Avaliação atualizada com sucesso.", "success");
      } else {
        await createPerformanceReview(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Avaliação criada com sucesso.", "success");
      }
      refresh();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar avaliação",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reviewToDelete) return;
    try {
      await deletePerformanceReview(reviewToDelete.id);
      showToast("Avaliação excluída.", "success");
      refresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir avaliação",
        "error"
      );
    } finally {
      setReviewToDelete(null);
    }
  };

  return (
    <div className="reviews_page">
      <div className="reviews_page__header">
        <h1>Avaliação de Desempenho</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Nova avaliação
        </Button>
      </div>

      <div className="reviews_page__filters">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PerformanceReviewStatus | "all")
          }
        >
          <option value="all">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="finalizada">Finalizada</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="reviews_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="reviews_page__empty">Carregando avaliações...</p>
      ) : reviews.length === 0 ? (
        <p className="reviews_page__empty">
          Nenhuma avaliação encontrada. Cadastre funcionários ativos em Gestão
          de Funcionários antes de avaliar.
        </p>
      ) : (
        <div className="reviews_page__table_wrap">
          <table className="reviews_page__table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Período</th>
                <th>Nota</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>{review.employeeName}</td>
                  <td>{review.period}</td>
                  <td>{review.score}/5</td>
                  <td>
                    <Badge tone={STATUS_TONE[review.status]}>
                      {STATUS_LABEL[review.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="reviews_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(review)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setReviewToDelete(review)}>
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
        title={editingId ? "Editar avaliação" : "Nova avaliação"}
      >
        <form className="reviews_page__form" onSubmit={handleSubmit}>
          <div className="reviews_page__form__grid">
            <FormField label="Funcionário*">
              <select
                required
                value={form.employeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
              >
                <option value="">Selecione o funcionário</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Período*">
              <input
                required
                placeholder="ex: 2026-Q3"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
              />
            </FormField>
            <FormField label="Nota (1 a 5)*">
              <input
                required
                type="number"
                min="1"
                max="5"
                step="1"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as PerformanceReviewStatus })
                }
              >
                <option value="rascunho">Rascunho</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </FormField>
          </div>
          <FormField label="Pontos fortes">
            <textarea
              value={form.strengths}
              onChange={(e) => setForm({ ...form, strengths: e.target.value })}
            />
          </FormField>
          <FormField label="Pontos a melhorar">
            <textarea
              value={form.improvements}
              onChange={(e) => setForm({ ...form, improvements: e.target.value })}
            />
          </FormField>
          <div className="reviews_page__form__actions">
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
        isOpen={!!reviewToDelete}
        title="Excluir avaliação"
        message={`Excluir a avaliação de "${reviewToDelete?.employeeName}" (${reviewToDelete?.period})?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setReviewToDelete(null)}
      />
    </div>
  );
}
