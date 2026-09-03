import { useMemo, useState } from "react";
import { orderBy, where } from "firebase/firestore";
import Badge from "../../common/Badge";
import Pagination from "../../common/Pagination";
import { usePaginatedCollection } from "../../../hooks/usePaginatedCollection";
import { mapAuditLog } from "../../../services/shared/auditLog";
import { AuditAction, IAuditFieldChange } from "../../../types/auditLog";
import { PAGE_SIZE } from "../../../constants/pagination";
import "./styles.scss";

const ENTITY_LABELS: Record<string, string> = {
  contacts: "Contato",
  contracts: "Contrato",
  employees: "Funcionário",
  payables: "Contas a Pagar",
  receivables: "Contas a Receber",
  followUps: "Follow-up",
  ledgerEntries: "Lançamento Contábil",
  payrollEntries: "Folha de Pagamento",
  candidates: "Candidato",
  trainings: "Treinamento",
  performanceReviews: "Avaliação de Desempenho",
  suppliers: "Fornecedor",
  products: "Produto",
  inventoryItems: "Item de Estoque",
  purchaseOrders: "Pedido de Compra",
  shipments: "Remessa",
  warehouses: "Armazém",
  productionPlans: "Plano de Produção",
  productionOrders: "Ordem de Produção",
  qualityChecks: "Controle de Qualidade",
  maintenanceRequests: "Manutenção",
  projects: "Projeto",
  resourceAllocations: "Alocação de Recursos",
  projectMilestones: "Marco de Projeto",
  projectTasks: "Tarefa de Projeto",
  savedReports: "Relatório Salvo",
  complianceItems: "Item de Conformidade",
  internalAudits: "Auditoria Interna",
  regulations: "Regulamentação",
  announcements: "Comunicado",
  departmentInitiatives: "Iniciativa de Departamento",
  users: "Acesso de Usuário",
  companies: "Empresa (Configurações)",
};

const ACTION_LABEL: Record<AuditAction, string> = {
  update: "Editado",
  delete: "Excluído",
};

const ACTION_TONE: Record<AuditAction, "warning" | "danger"> = {
  update: "warning",
  delete: "danger",
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
};

const formatChangedFields = (changes: IAuditFieldChange[]): string => {
  if (changes.length === 0) return "—";
  return changes
    .map((change) => `${change.field}: ${formatValue(change.before)} → ${formatValue(change.after)}`)
    .join("; ");
};

export default function Historico() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const constraints = useMemo(
    () =>
      entityTypeFilter === "all"
        ? [orderBy("createdAt", "desc")]
        : [where("entityType", "==", entityTypeFilter), orderBy("createdAt", "desc")],
    [entityTypeFilter]
  );

  const {
    items: logs,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
    error: pageError,
  } = usePaginatedCollection({
    collectionPath: "auditLogs",
    constraints,
    mapDoc: mapAuditLog,
    pageSize: PAGE_SIZE,
    resetKey: entityTypeFilter,
  });

  return (
    <div className="history_page">
      <div className="history_page__header">
        <h1>Histórico e Auditoria</h1>
      </div>

      <div className="history_page__filters">
        <select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)}>
          <option value="all">Todos os módulos</option>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {pageError && <p className="history_page__error">{pageError}</p>}

      {loading ? (
        <p className="history_page__empty">Carregando histórico...</p>
      ) : logs.length === 0 ? (
        <p className="history_page__empty">Nenhum registro de alteração encontrado.</p>
      ) : (
        <div className="history_page__table_wrap">
          <table className="history_page__table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Usuário</th>
                <th>Módulo</th>
                <th>Registro</th>
                <th>Ação</th>
                <th>Alterações</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.createdAt?.toDate().toLocaleString("pt-BR") ?? "—"}</td>
                  <td>{log.ownerName || "—"}</td>
                  <td>{ENTITY_LABELS[log.entityType] ?? log.entityType}</td>
                  <td>{log.entitySummary}</td>
                  <td>
                    <Badge tone={ACTION_TONE[log.action]}>{ACTION_LABEL[log.action]}</Badge>
                  </td>
                  <td>{formatChangedFields(log.changedFields)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
