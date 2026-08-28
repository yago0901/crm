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
  createProductionPlan,
  deleteProductionPlan,
  getActiveProductionPlansCount,
  mapProductionPlan,
  updateProductionPlan,
} from "../../../services/producao-manufatura/productionPlans";
import { IProductionPlan, ProductionPlanInput, ProductionPlanStatus } from "../../../types/productionPlan";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<ProductionPlanStatus, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_TONE: Record<ProductionPlanStatus, "info" | "warning" | "success" | "danger"> = {
  planejado: "info",
  em_andamento: "warning",
  concluido: "success",
  cancelado: "danger",
};

const EMPTY_FORM: ProductionPlanInput = {
  productName: "",
  targetQuantity: 0,
  startDate: null,
  endDate: null,
  status: "planejado",
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function PlanejamentoProducao() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeCount, setActiveCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProductionPlanStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("startDate", "asc")]
        : [where("status", "==", statusFilter), orderBy("startDate", "asc")],
    [statusFilter]
  );

  const {
    items: plans,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "productionPlans",
    constraints,
    mapDoc: mapProductionPlan,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshActiveCount = () => {
    getActiveProductionPlansCount()
      .then(setActiveCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshActiveCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductionPlanInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [planToDelete, setPlanToDelete] = useState<IProductionPlan | null>(null);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (plan: IProductionPlan) => {
    setEditingId(plan.id);
    setForm({
      productName: plan.productName,
      targetQuantity: plan.targetQuantity,
      startDate: plan.startDate,
      endDate: plan.endDate,
      status: plan.status,
      notes: plan.notes,
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
        await updateProductionPlan(editingId, form);
        showToast("Plano de produção atualizado.", "success");
      } else {
        await createProductionPlan(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Plano de produção criado.", "success");
      }
      refresh();
      refreshActiveCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar plano",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    try {
      await deleteProductionPlan(planToDelete.id);
      showToast("Plano de produção excluído.", "success");
      refresh();
      refreshActiveCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir plano",
        "error"
      );
    } finally {
      setPlanToDelete(null);
    }
  };

  return (
    <div className="production_plans_page">
      <div className="production_plans_page__header">
        <h1>Planejamento de Produção</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo plano
        </Button>
      </div>

      <div className="production_plans_page__summary">
        <span>Em andamento</span>
        <strong>{activeCount}</strong>
      </div>

      <div className="production_plans_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProductionPlanStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="planejado">Planejado</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="production_plans_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="production_plans_page__empty">Carregando planos...</p>
      ) : plans.length === 0 ? (
        <p className="production_plans_page__empty">Nenhum plano de produção encontrado.</p>
      ) : (
        <div className="production_plans_page__table_wrap">
          <table className="production_plans_page__table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd. alvo</th>
                <th>Início</th>
                <th>Término</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.productName}</td>
                  <td>{plan.targetQuantity}</td>
                  <td>{toDateInput(plan.startDate) || "—"}</td>
                  <td>{toDateInput(plan.endDate) || "—"}</td>
                  <td>
                    <Badge tone={STATUS_TONE[plan.status]}>
                      {STATUS_LABEL[plan.status]}
                    </Badge>
                  </td>
                  <td>
                    <div className="production_plans_page__table__actions">
                      <Button variant="secondary" onClick={() => openEditForm(plan)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setPlanToDelete(plan)}>
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
        title={editingId ? "Editar plano" : "Novo plano de produção"}
      >
        <form className="production_plans_page__form" onSubmit={handleSubmit}>
          <div className="production_plans_page__form__grid">
            <FormField label="Produto*">
              <input
                required
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </FormField>
            <FormField label="Quantidade alvo*">
              <input
                required
                type="number"
                min="0"
                value={form.targetQuantity}
                onChange={(e) => setForm({ ...form, targetQuantity: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Início">
              <input
                type="date"
                value={toDateInput(form.startDate)}
                onChange={(e) =>
                  setForm({ ...form, startDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Término">
              <input
                type="date"
                value={toDateInput(form.endDate)}
                onChange={(e) =>
                  setForm({ ...form, endDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProductionPlanStatus })
                }
              >
                <option value="planejado">Planejado</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="production_plans_page__form__actions">
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
        isOpen={!!planToDelete}
        title="Excluir plano de produção"
        message={`Excluir o plano de "${planToDelete?.productName}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPlanToDelete(null)}
      />
    </div>
  );
}
