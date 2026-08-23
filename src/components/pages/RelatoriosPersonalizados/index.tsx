import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/auth";
import { useToast } from "../../common/Toast";
import Button from "../../common/Button";
import Badge from "../../common/Badge";
import FormField from "../../common/FormField";
import ConfirmDialog from "../../common/ConfirmDialog";
import {
  createSavedReport,
  deleteSavedReport,
  IReportResult,
  REPORT_SOURCES,
  runReport,
  subscribeToSavedReports,
} from "../../../services/business-intelligence/reports";
import { ISavedReport, ReportSource } from "../../../types/savedReport";
import "./styles.scss";

const SOURCE_OPTIONS = Object.entries(REPORT_SOURCES) as [ReportSource, (typeof REPORT_SOURCES)[ReportSource]][];

export default function RelatoriosPersonalizados() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [savedReports, setSavedReports] = useState<ISavedReport[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [source, setSource] = useState<ReportSource>("contacts");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const [result, setResult] = useState<IReportResult | null>(null);
  const [running, setRunning] = useState(false);

  const [reportToDelete, setReportToDelete] = useState<ISavedReport | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSavedReports(
      (reports) => {
        setSavedReports(reports);
        setLoadingSaved(false);
      },
      (err) => {
        setError(err.message);
        setLoadingSaved(false);
      }
    );
    return unsubscribe;
  }, []);

  const handleSourceChange = (nextSource: ReportSource) => {
    setSource(nextSource);
    setStatusFilter("all");
  };

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const reportResult = await runReport(source, statusFilter);
      setResult(reportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar relatório");
    } finally {
      setRunning(false);
    }
  };

  const handleRunSaved = async (report: ISavedReport) => {
    setSource(report.source);
    setStatusFilter(report.statusFilter);
    setRunning(true);
    setError(null);
    try {
      const reportResult = await runReport(report.source, report.statusFilter);
      setResult(reportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar relatório");
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !name.trim()) return;

    setSaving(true);
    try {
      await createSavedReport(
        { name, source, statusFilter, notes: "" },
        { uid: currentUser.uid, name: currentUser.displayName ?? currentUser.email }
      );
      showToast("Relatório salvo com sucesso.", "success");
      setName("");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar relatório",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      await deleteSavedReport(reportToDelete.id);
      showToast("Relatório excluído.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir relatório",
        "error"
      );
    } finally {
      setReportToDelete(null);
    }
  };

  return (
    <div className="reports_page">
      <div className="reports_page__header">
        <h1>Relatórios Personalizados</h1>
      </div>

      {error && <p className="reports_page__error">{error}</p>}

      <div className="reports_page__builder">
        <h2>Montar relatório</h2>
        <div className="reports_page__builder__grid">
          <FormField label="Fonte de dados">
            <select
              value={source}
              onChange={(e) => handleSourceChange(e.target.value as ReportSource)}
            >
              {SOURCE_OPTIONS.map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos os status</option>
              {REPORT_SOURCES[source].statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>
          <Button variant="secondary" onClick={handleRun} disabled={running}>
            {running ? "Executando..." : "Executar"}
          </Button>
        </div>

        <form className="reports_page__save_form" onSubmit={handleSave}>
          <FormField label="Salvar como">
            <input
              placeholder="Nome do relatório"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
            {saving ? "Salvando..." : "Salvar relatório"}
          </Button>
        </form>
      </div>

      {result && (
        <div className="reports_page__result">
          <h2>
            Resultado — {result.count}{" "}
            {result.count === 1 ? "registro" : "registros"}
          </h2>
          {result.items.length === 0 ? (
            <p className="reports_page__empty">Nenhum registro encontrado.</p>
          ) : (
            <ul className="reports_page__result__list">
              {result.items.map((item) => (
                <li key={item.id}>
                  <span>{item.label}</span>
                  {item.status && <Badge tone="neutral">{item.status}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="reports_page__saved">
        <h2>Relatórios salvos</h2>
        {loadingSaved ? (
          <p className="reports_page__empty">Carregando...</p>
        ) : savedReports.length === 0 ? (
          <p className="reports_page__empty">Nenhum relatório salvo ainda.</p>
        ) : (
          <ul className="reports_page__saved__list">
            {savedReports.map((report) => (
              <li key={report.id}>
                <div className="reports_page__saved__list__info">
                  <strong>{report.name}</strong>
                  <span>
                    {REPORT_SOURCES[report.source].label} · {report.statusFilter}
                  </span>
                </div>
                <div className="reports_page__saved__list__actions">
                  <Button variant="secondary" onClick={() => handleRunSaved(report)}>
                    Executar
                  </Button>
                  <Button variant="danger" onClick={() => setReportToDelete(report)}>
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!reportToDelete}
        title="Excluir relatório"
        message={`Excluir "${reportToDelete?.name}"?`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setReportToDelete(null)}
      />
    </div>
  );
}
