import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/auth/AuthContext";
import { useToast } from "../../common/Toast/ToastContext";
import Button from "../../common/Button";
import FormField from "../../common/FormField";
import ConfirmDialog from "../../common/ConfirmDialog";
import ReportChart from "../../common/charts/ReportChart";
import {
  createSavedReport,
  deleteSavedReport,
  IReportRun,
  REPORT_SOURCES,
  runReport,
  subscribeToSavedReports,
  toCsv,
} from "../../../services/business-intelligence/reports";
import {
  EMPTY_REPORT_CONFIG,
  IReportConfig,
  IReportFilter,
  ISavedReport,
  ReportAggregationFn,
  ReportOperator,
  ReportSource,
} from "../../../types/savedReport";
import {
  MAX_INPUT_DATE,
  MIN_INPUT_DATE,
  fromDateInput,
  toDateInput,
} from "../../../utils/dateInput";
import "./styles.scss";

const SOURCE_OPTIONS = Object.entries(REPORT_SOURCES) as [
  ReportSource,
  (typeof REPORT_SOURCES)[ReportSource],
][];

const OPERATOR_LABEL: Record<ReportOperator, string> = {
  eq: "é",
  neq: "não é",
  contains: "contém",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
};

const OPERATORS_BY_TYPE: Record<string, ReportOperator[]> = {
  string: ["contains", "eq", "neq"],
  enum: ["eq", "neq"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte"],
  date: ["eq", "neq", "gt", "gte", "lt", "lte"],
};

const AGG_LABEL: Record<ReportAggregationFn, string> = {
  count: "Contagem",
  sum: "Soma",
  avg: "Média",
};

export default function RelatoriosPersonalizados() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [savedReports, setSavedReports] = useState<ISavedReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<ReportSource>("receivables");
  const [config, setConfig] = useState<IReportConfig>(EMPTY_REPORT_CONFIG);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const [result, setResult] = useState<IReportRun | null>(null);
  const [running, setRunning] = useState(false);

  const [reportToDelete, setReportToDelete] = useState<ISavedReport | null>(null);

  const fields = REPORT_SOURCES[source].fields;
  const numberFields = useMemo(() => fields.filter((f) => f.type === "number"), [fields]);

  useEffect(() => {
    const unsubscribe = subscribeToSavedReports(
      setSavedReports,
      (err) => setError(err.message)
    );
    return unsubscribe;
  }, []);

  const handleSourceChange = (next: ReportSource) => {
    setSource(next);
    setConfig(EMPTY_REPORT_CONFIG);
    setResult(null);
  };

  const patch = (part: Partial<IReportConfig>) => setConfig((c) => ({ ...c, ...part }));

  const toggleColumn = (key: string) => {
    setConfig((c) => ({
      ...c,
      columns: c.columns.includes(key)
        ? c.columns.filter((k) => k !== key)
        : [...c.columns, key],
    }));
  };

  const addFilter = () => {
    const first = fields[0];
    patch({
      filters: [
        ...config.filters,
        { field: first.key, operator: OPERATORS_BY_TYPE[first.type][0], value: "" },
      ],
    });
  };

  const updateFilter = (index: number, part: Partial<IReportFilter>) => {
    patch({
      filters: config.filters.map((f, i) => (i === index ? { ...f, ...part } : f)),
    });
  };

  const removeFilter = (index: number) => {
    patch({ filters: config.filters.filter((_, i) => i !== index) });
  };

  const handleRun = async (runSource = source, runConfig = config) => {
    setRunning(true);
    setError(null);
    try {
      setResult(await runReport(runSource, runConfig));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar relatório");
    } finally {
      setRunning(false);
    }
  };

  const handleRunSaved = (report: ISavedReport) => {
    setSource(report.source);
    setConfig(report.config);
    handleRun(report.source, report.config);
  };

  const handleSave = async () => {
    if (!currentUser || !name.trim()) return;
    setSaving(true);
    try {
      await createSavedReport(
        { name: name.trim(), source, config, notes: "" },
        { uid: currentUser.uid, name: currentUser.displayName ?? currentUser.email }
      );
      showToast("Relatório salvo com sucesso.", "success");
      setName("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar relatório", "error");
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
      showToast(err instanceof Error ? err.message : "Erro ao excluir relatório", "error");
    } finally {
      setReportToDelete(null);
    }
  };

  const handleExportCsv = () => {
    if (!result) return;
    const csv = toCsv(result.columns, result.rows);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${source}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports_page">
      <div className="reports_page__header">
        <h1>Relatórios Personalizados</h1>
      </div>

      {error && <p className="reports_page__error">{error}</p>}

      <div className="reports_page__builder">
        <div className="reports_page__builder__row">
          <FormField label="Fonte de dados">
            <select
              value={source}
              onChange={(e) => handleSourceChange(e.target.value as ReportSource)}
            >
              {SOURCE_OPTIONS.map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="reports_page__section">
          <h3>Colunas</h3>
          <div className="reports_page__chips">
            {fields.map((field) => (
              <label key={field.key} className="reports_page__chip">
                <input
                  type="checkbox"
                  checked={config.columns.includes(field.key)}
                  onChange={() => toggleColumn(field.key)}
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>

        <div className="reports_page__section">
          <h3>Filtros</h3>
          {config.filters.map((filter, index) => {
            const field = fields.find((f) => f.key === filter.field) ?? fields[0];
            return (
              <div key={index} className="reports_page__filter_row">
                <select
                  value={filter.field}
                  onChange={(e) => {
                    const nextField = fields.find((f) => f.key === e.target.value)!;
                    updateFilter(index, {
                      field: nextField.key,
                      operator: OPERATORS_BY_TYPE[nextField.type][0],
                      value: "",
                    });
                  }}
                >
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) =>
                    updateFilter(index, { operator: e.target.value as ReportOperator })
                  }
                >
                  {OPERATORS_BY_TYPE[field.type].map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABEL[op]}
                    </option>
                  ))}
                </select>
                {field.type === "enum" ? (
                  <select
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {field.enumValues?.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : "text"
                    }
                    min={field.type === "date" ? MIN_INPUT_DATE : undefined}
                    max={field.type === "date" ? MAX_INPUT_DATE : undefined}
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                  />
                )}
                <Button type="button" variant="secondary" onClick={() => removeFilter(index)}>
                  Remover
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="secondary" onClick={addFilter}>
            + Adicionar filtro
          </Button>
        </div>

        <div className="reports_page__section">
          <h3>Período (por {REPORT_SOURCES[source].dateFieldLabel})</h3>
          <div className="reports_page__builder__row">
            <FormField label="De">
              <input
                type="date"
                min={MIN_INPUT_DATE}
                max={MAX_INPUT_DATE}
                value={toDateInput(config.dateFrom)}
                onChange={(e) => patch({ dateFrom: fromDateInput(e.target.value) })}
              />
            </FormField>
            <FormField label="Até">
              <input
                type="date"
                min={MIN_INPUT_DATE}
                max={MAX_INPUT_DATE}
                value={toDateInput(config.dateTo)}
                onChange={(e) => patch({ dateTo: fromDateInput(e.target.value) })}
              />
            </FormField>
          </div>
        </div>

        <div className="reports_page__section">
          <h3>Agrupar e ordenar</h3>
          <div className="reports_page__builder__row">
            <FormField label="Agrupar por">
              <select
                value={config.groupByField}
                onChange={(e) => patch({ groupByField: e.target.value })}
              >
                <option value="">Não agrupar (tabela)</option>
                {fields
                  .filter((f) => f.type === "enum" || f.type === "string")
                  .map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
              </select>
            </FormField>
            {config.groupByField && (
              <>
                <FormField label="Métrica">
                  <select
                    value={config.aggregationFn}
                    onChange={(e) =>
                      patch({ aggregationFn: e.target.value as ReportAggregationFn })
                    }
                  >
                    {(Object.keys(AGG_LABEL) as ReportAggregationFn[]).map((fn) => (
                      <option key={fn} value={fn}>
                        {AGG_LABEL[fn]}
                      </option>
                    ))}
                  </select>
                </FormField>
                {config.aggregationFn !== "count" && (
                  <FormField label="Campo">
                    <select
                      value={config.aggregationField}
                      onChange={(e) => patch({ aggregationField: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {numberFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}
                <FormField label="Gráfico">
                  <select
                    value={config.chart}
                    onChange={(e) =>
                      patch({ chart: e.target.value as IReportConfig["chart"] })
                    }
                  >
                    <option value="none">Nenhum</option>
                    <option value="bar">Barras</option>
                    <option value="pie">Pizza</option>
                  </select>
                </FormField>
              </>
            )}
            {!config.groupByField && (
              <>
                <FormField label="Ordenar por">
                  <select
                    value={config.sortField}
                    onChange={(e) => patch({ sortField: e.target.value })}
                  >
                    <option value="">Sem ordenação</option>
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Direção">
                  <select
                    value={config.sortDir}
                    onChange={(e) =>
                      patch({ sortDir: e.target.value as "asc" | "desc" })
                    }
                  >
                    <option value="asc">Crescente</option>
                    <option value="desc">Decrescente</option>
                  </select>
                </FormField>
              </>
            )}
          </div>
        </div>

        <div className="reports_page__actions">
          <Button variant="primary" onClick={() => handleRun()} disabled={running}>
            {running ? "Executando..." : "Executar"}
          </Button>
          <input
            className="reports_page__save_name"
            placeholder="Nome para salvar"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? "Salvando..." : "Salvar relatório"}
          </Button>
        </div>
      </div>

      {result && (
        <div className="reports_page__result">
          <div className="reports_page__result__header">
            <h2>
              {result.mode === "grouped"
                ? `${result.groups.length} grupos`
                : `${result.total} ${result.total === 1 ? "registro" : "registros"}`}
            </h2>
            <Button variant="secondary" onClick={handleExportCsv} disabled={result.rows.length === 0}>
              Exportar CSV
            </Button>
          </div>

          {result.mode === "grouped" && config.chart !== "none" && (
            <div className="reports_page__chart">
              <ReportChart
                title="Resultado"
                type={config.chart === "pie" ? "pie" : "bar"}
                data={result.groups}
              />
            </div>
          )}

          {result.rows.length === 0 ? (
            <p className="reports_page__empty">Nenhum registro encontrado.</p>
          ) : (
            <div className="reports_page__table_wrap">
              <table className="reports_page__table">
                <thead>
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="reports_page__saved">
        <h2>Relatórios salvos</h2>
        {savedReports.length === 0 ? (
          <p className="reports_page__empty">Nenhum relatório salvo ainda.</p>
        ) : (
          <ul className="reports_page__saved__list">
            {savedReports.map((report) => (
              <li key={report.id}>
                <div className="reports_page__saved__list__info">
                  <strong>{report.name}</strong>
                  <span>{REPORT_SOURCES[report.source]?.label ?? report.source}</span>
                </div>
                <div className="reports_page__saved__list__actions">
                  <Button variant="secondary" onClick={() => handleRunSaved(report)}>
                    Abrir
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
