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
  createCandidate,
  deleteCandidate,
  getCandidatesInScreeningCount,
  mapCandidate,
  updateCandidate,
} from "../../../services/rh/candidates";
import { convertCandidateToEmployee } from "../../../services/rh/employees";
import { CandidateInput, CandidateStatus, ICandidate } from "../../../types/candidate";
import { EmployeeInput } from "../../../types/employee";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const STATUS_LABEL: Record<CandidateStatus, string> = {
  triagem: "Triagem",
  entrevista: "Entrevista",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_TONE: Record<CandidateStatus, "info" | "warning" | "success" | "danger"> = {
  triagem: "info",
  entrevista: "warning",
  aprovado: "success",
  reprovado: "danger",
};

const EMPTY_FORM: CandidateInput = {
  name: "",
  email: "",
  phone: "",
  position: "",
  status: "triagem",
  notes: "",
};

const EMPTY_CONVERT_FORM: EmployeeInput = {
  name: "",
  email: "",
  phone: "",
  role: "",
  department: "",
  status: "ativo",
  salary: 0,
  hireDate: null,
  notes: "",
};

const toDateInput = (value: Timestamp | null) =>
  value ? value.toDate().toISOString().slice(0, 10) : "";

const fromDateInput = (value: string): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(`${value}T00:00:00`)) : null;

export default function Recrutamento() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [screeningCount, setScreeningCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">("all");

  const constraints = useMemo(
    () =>
      statusFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("status", "==", statusFilter), orderBy("createdAt", "desc")],
    [statusFilter]
  );

  const {
    items: candidates,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
    refresh,
  } = usePaginatedCollection({
    collectionPath: "candidates",
    constraints,
    mapDoc: mapCandidate,
    pageSize: PAGE_SIZE,
    resetKey: statusFilter,
  });

  const refreshScreeningCount = () => {
    getCandidatesInScreeningCount()
      .then(setScreeningCount)
      .catch((err) => setLoadError(err.message));
  };

  useEffect(() => {
    refreshScreeningCount();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CandidateInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [candidateToDelete, setCandidateToDelete] = useState<ICandidate | null>(null);

  const [candidateToConvert, setCandidateToConvert] = useState<ICandidate | null>(null);
  const [convertForm, setConvertForm] = useState<EmployeeInput>(EMPTY_CONVERT_FORM);
  const [converting, setConverting] = useState(false);

  const openConvert = (candidate: ICandidate) => {
    setCandidateToConvert(candidate);
    setConvertForm({
      ...EMPTY_CONVERT_FORM,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone ?? "",
      role: candidate.position,
    });
  };

  const closeConvert = () => {
    setCandidateToConvert(null);
    setConvertForm(EMPTY_CONVERT_FORM);
  };

  const handleConvertSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !candidateToConvert) return;

    setConverting(true);
    try {
      await convertCandidateToEmployee(candidateToConvert.id, convertForm, {
        uid: currentUser.uid,
        name: currentUser.displayName ?? currentUser.email,
      });
      showToast("Candidato convertido em funcionário.", "success");
      refresh();
      closeConvert();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao converter candidato",
        "error"
      );
    } finally {
      setConverting(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (candidate: ICandidate) => {
    setEditingId(candidate.id);
    setForm({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      position: candidate.position,
      status: candidate.status,
      notes: candidate.notes,
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
        await updateCandidate(editingId, form);
        showToast("Candidato atualizado com sucesso.", "success");
      } else {
        await createCandidate(form, {
          uid: currentUser.uid,
          name: currentUser.displayName ?? currentUser.email,
        });
        showToast("Candidato cadastrado com sucesso.", "success");
      }
      refresh();
      refreshScreeningCount();
      closeForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar candidato",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!candidateToDelete) return;
    try {
      await deleteCandidate(candidateToDelete.id);
      showToast("Candidato excluído.", "success");
      refresh();
      refreshScreeningCount();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir candidato",
        "error"
      );
    } finally {
      setCandidateToDelete(null);
    }
  };

  return (
    <div className="candidates_page">
      <div className="candidates_page__header">
        <h1>Recrutamento</h1>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo candidato
        </Button>
      </div>

      <div className="candidates_page__summary">
        <span>Em triagem</span>
        <strong>{screeningCount}</strong>
      </div>

      <div className="candidates_page__filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CandidateStatus | "all")}
        >
          <option value="all">Todos os status</option>
          <option value="triagem">Triagem</option>
          <option value="entrevista">Entrevista</option>
          <option value="aprovado">Aprovado</option>
          <option value="reprovado">Reprovado</option>
        </select>
      </div>

      {(loadError || pageError) && (
        <p className="candidates_page__error">{loadError ?? pageError}</p>
      )}

      {loading ? (
        <p className="candidates_page__empty">Carregando candidatos...</p>
      ) : candidates.length === 0 ? (
        <p className="candidates_page__empty">Nenhum candidato encontrado.</p>
      ) : (
        <div className="candidates_page__table_wrap">
          <table className="candidates_page__table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Vaga</th>
                <th>Contato</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td>{candidate.name}</td>
                  <td>{candidate.position}</td>
                  <td>{candidate.email}</td>
                  <td>
                    <Badge tone={STATUS_TONE[candidate.status]}>
                      {STATUS_LABEL[candidate.status]}
                    </Badge>
                    {candidate.convertedToEmployeeId && (
                      <Badge tone="neutral">Convertido</Badge>
                    )}
                  </td>
                  <td>
                    <div className="candidates_page__table__actions">
                      {candidate.status === "aprovado" && !candidate.convertedToEmployeeId && (
                        <Button variant="primary" onClick={() => openConvert(candidate)}>
                          Converter em funcionário
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => openEditForm(candidate)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => setCandidateToDelete(candidate)}>
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
        title={editingId ? "Editar candidato" : "Novo candidato"}
      >
        <form className="candidates_page__form" onSubmit={handleSubmit}>
          <div className="candidates_page__form__grid">
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
            <FormField label="Vaga*">
              <input
                required
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CandidateStatus })
                }
              >
                <option value="triagem">Triagem</option>
                <option value="entrevista">Entrevista</option>
                <option value="aprovado">Aprovado</option>
                <option value="reprovado">Reprovado</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="candidates_page__form__actions">
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
        isOpen={!!candidateToDelete}
        title="Excluir candidato"
        message={`Excluir "${candidateToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setCandidateToDelete(null)}
      />

      <Modal
        isOpen={!!candidateToConvert}
        onClose={closeConvert}
        title={`Converter em funcionário — ${candidateToConvert?.name ?? ""}`}
      >
        <form className="candidates_page__form" onSubmit={handleConvertSubmit}>
          <div className="candidates_page__form__grid">
            <FormField label="Nome*">
              <input
                required
                value={convertForm.name}
                onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })}
              />
            </FormField>
            <FormField label="E-mail*">
              <input
                required
                type="email"
                value={convertForm.email}
                onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })}
              />
            </FormField>
            <FormField label="Telefone">
              <input
                value={convertForm.phone}
                onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })}
              />
            </FormField>
            <FormField label="Cargo*">
              <input
                required
                value={convertForm.role}
                onChange={(e) => setConvertForm({ ...convertForm, role: e.target.value })}
              />
            </FormField>
            <FormField label="Departamento*">
              <input
                required
                value={convertForm.department}
                onChange={(e) => setConvertForm({ ...convertForm, department: e.target.value })}
              />
            </FormField>
            <FormField label="Salário (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={convertForm.salary}
                onChange={(e) =>
                  setConvertForm({ ...convertForm, salary: Number(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Data de admissão">
              <input
                type="date"
                value={toDateInput(convertForm.hireDate)}
                onChange={(e) =>
                  setConvertForm({ ...convertForm, hireDate: fromDateInput(e.target.value) })
                }
              />
            </FormField>
          </div>
          <div className="candidates_page__form__actions">
            <Button type="button" variant="secondary" onClick={closeConvert} disabled={converting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={converting}>
              {converting ? "Convertendo..." : "Converter"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
