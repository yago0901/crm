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
  weightedCompetencyScore,
  weightedGoalAttainment,
} from "../../../services/rh/performanceScore";
import {
  DevelopmentActionStatus,
  ICompetencyRating,
  IDevelopmentAction,
  IIndividualGoal,
  IPerformanceReview,
  PerformanceReviewInput,
  PerformanceReviewStatus,
} from "../../../types/performanceReview";
import { IEmployee } from "../../../types/employee";
import { PAGE_SIZE } from "../../../constants/pagination";
import {
  MAX_INPUT_DATE,
  MIN_INPUT_DATE,
  fromDateInput,
  toDateInput,
} from "../../../utils/dateInput";
import "./styles.scss";

const STATUS_LABEL: Record<PerformanceReviewStatus, string> = {
  rascunho: "Rascunho",
  finalizada: "Finalizada",
};

const STATUS_TONE: Record<PerformanceReviewStatus, "neutral" | "success"> = {
  rascunho: "neutral",
  finalizada: "success",
};

const DEV_ACTION_STATUS_LABEL: Record<DevelopmentActionStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const EMPTY_COMPETENCY: ICompetencyRating = {
  name: "",
  weight: 1,
  selfScore: 0,
  managerScore: 0,
};

const EMPTY_DEV_ACTION: IDevelopmentAction = {
  action: "",
  deadline: null,
  status: "pendente",
};

const EMPTY_GOAL: IIndividualGoal = {
  description: "",
  weight: 1,
  progressPercent: 0,
};

const EMPTY_FORM: PerformanceReviewInput = {
  employeeId: "",
  employeeName: "",
  period: "",
  score: 3,
  strengths: "",
  improvements: "",
  competencies: [],
  developmentPlan: [],
  goals: [],
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

  const [competencyDraft, setCompetencyDraft] = useState<ICompetencyRating>(EMPTY_COMPETENCY);
  const [devActionDraft, setDevActionDraft] = useState<IDevelopmentAction>(EMPTY_DEV_ACTION);
  const [goalDraft, setGoalDraft] = useState<IIndividualGoal>(EMPTY_GOAL);

  const [reviewToDelete, setReviewToDelete] = useState<IPerformanceReview | null>(null);

  const competencies = useMemo(() => form.competencies ?? [], [form.competencies]);
  const developmentPlan = form.developmentPlan ?? [];
  const goals = useMemo(() => form.goals ?? [], [form.goals]);

  const weightedSelf = useMemo(
    () => weightedCompetencyScore(competencies, "selfScore"),
    [competencies]
  );
  const weightedManager = useMemo(
    () => weightedCompetencyScore(competencies, "managerScore"),
    [competencies]
  );
  const goalAttainment = useMemo(() => weightedGoalAttainment(goals), [goals]);

  const resetDrafts = () => {
    setCompetencyDraft(EMPTY_COMPETENCY);
    setDevActionDraft(EMPTY_DEV_ACTION);
    setGoalDraft(EMPTY_GOAL);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    resetDrafts();
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
      competencies: review.competencies ?? [],
      developmentPlan: review.developmentPlan ?? [],
      goals: review.goals ?? [],
      status: review.status,
    });
    resetDrafts();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    resetDrafts();
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setForm({ ...form, employeeId, employeeName: employee?.name ?? "" });
  };

  const addCompetency = () => {
    if (!competencyDraft.name.trim()) return;
    setForm({ ...form, competencies: [...competencies, competencyDraft] });
    setCompetencyDraft(EMPTY_COMPETENCY);
  };

  const updateCompetency = (index: number, patch: Partial<ICompetencyRating>) => {
    setForm({
      ...form,
      competencies: competencies.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  };

  const removeCompetency = (index: number) => {
    setForm({ ...form, competencies: competencies.filter((_, i) => i !== index) });
  };

  const addDevAction = () => {
    if (!devActionDraft.action.trim()) return;
    setForm({ ...form, developmentPlan: [...developmentPlan, devActionDraft] });
    setDevActionDraft(EMPTY_DEV_ACTION);
  };

  const removeDevAction = (index: number) => {
    setForm({ ...form, developmentPlan: developmentPlan.filter((_, i) => i !== index) });
  };

  const addGoal = () => {
    if (!goalDraft.description.trim()) return;
    setForm({ ...form, goals: [...goals, goalDraft] });
    setGoalDraft(EMPTY_GOAL);
  };

  const removeGoal = (index: number) => {
    setForm({ ...form, goals: goals.filter((_, i) => i !== index) });
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
            <FormField label="Nota geral (1 a 5)*">
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

          <div className="reviews_page__section">
            <h3>Competências</h3>
            {competencies.length > 0 && (
              <table className="reviews_page__competencies">
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th>Peso</th>
                    <th>Autoaval.</th>
                    <th>Gestor</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {competencies.map((competency, index) => (
                    <tr key={index}>
                      <td>{competency.name}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={competency.weight}
                          onChange={(e) =>
                            updateCompetency(index, { weight: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="1"
                          value={competency.selfScore}
                          onChange={(e) =>
                            updateCompetency(index, { selfScore: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="1"
                          value={competency.managerScore}
                          onChange={(e) =>
                            updateCompetency(index, { managerScore: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => removeCompetency(index)}
                        >
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="reviews_page__draft">
              <FormField label="Nova competência">
                <input
                  value={competencyDraft.name}
                  onChange={(e) =>
                    setCompetencyDraft({ ...competencyDraft, name: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Peso">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={competencyDraft.weight}
                  onChange={(e) =>
                    setCompetencyDraft({ ...competencyDraft, weight: Number(e.target.value) })
                  }
                />
              </FormField>
              <Button type="button" variant="secondary" onClick={addCompetency}>
                + Adicionar
              </Button>
            </div>
            {competencies.length > 0 && (
              <p className="reviews_page__hint">
                Média ponderada — autoavaliação: <strong>{weightedSelf}</strong> · gestor:{" "}
                <strong>{weightedManager}</strong> (numa escala de 0 a 5). A "Nota geral"
                acima continua sendo preenchida à mão.
              </p>
            )}
          </div>

          <div className="reviews_page__section">
            <h3>Plano de desenvolvimento individual (PDI)</h3>
            {developmentPlan.length > 0 && (
              <ul className="reviews_page__list">
                {developmentPlan.map((entry, index) => (
                  <li key={index}>
                    <span>
                      {entry.action} — {DEV_ACTION_STATUS_LABEL[entry.status]}
                      {entry.deadline ? ` — até ${toDateInput(entry.deadline)}` : ""}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => removeDevAction(index)}
                    >
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="reviews_page__draft">
              <FormField label="Ação de desenvolvimento">
                <input
                  value={devActionDraft.action}
                  onChange={(e) =>
                    setDevActionDraft({ ...devActionDraft, action: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Prazo">
                <input
                  type="date"
                  min={MIN_INPUT_DATE}
                  max={MAX_INPUT_DATE}
                  value={toDateInput(devActionDraft.deadline)}
                  onChange={(e) =>
                    setDevActionDraft({
                      ...devActionDraft,
                      deadline: fromDateInput(e.target.value),
                    })
                  }
                />
              </FormField>
              <FormField label="Situação">
                <select
                  value={devActionDraft.status}
                  onChange={(e) =>
                    setDevActionDraft({
                      ...devActionDraft,
                      status: e.target.value as DevelopmentActionStatus,
                    })
                  }
                >
                  {(Object.keys(DEV_ACTION_STATUS_LABEL) as DevelopmentActionStatus[]).map(
                    (status) => (
                      <option key={status} value={status}>
                        {DEV_ACTION_STATUS_LABEL[status]}
                      </option>
                    )
                  )}
                </select>
              </FormField>
              <Button type="button" variant="secondary" onClick={addDevAction}>
                + Adicionar
              </Button>
            </div>
          </div>

          <div className="reviews_page__section">
            <h3>Metas individuais</h3>
            {goals.length > 0 && (
              <ul className="reviews_page__list">
                {goals.map((goal, index) => (
                  <li key={index}>
                    <span>
                      {goal.description} — peso {goal.weight} — {goal.progressPercent}%
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => removeGoal(index)}
                    >
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="reviews_page__draft">
              <FormField label="Meta">
                <input
                  value={goalDraft.description}
                  onChange={(e) =>
                    setGoalDraft({ ...goalDraft, description: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Peso">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={goalDraft.weight}
                  onChange={(e) =>
                    setGoalDraft({ ...goalDraft, weight: Number(e.target.value) })
                  }
                />
              </FormField>
              <FormField label="Progresso (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={goalDraft.progressPercent}
                  onChange={(e) =>
                    setGoalDraft({ ...goalDraft, progressPercent: Number(e.target.value) })
                  }
                />
              </FormField>
              <Button type="button" variant="secondary" onClick={addGoal}>
                + Adicionar
              </Button>
            </div>
            {goals.length > 0 && (
              <p className="reviews_page__hint">
                Atingimento ponderado das metas: <strong>{goalAttainment}%</strong>
              </p>
            )}
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
