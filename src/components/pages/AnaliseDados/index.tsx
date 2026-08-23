import { useEffect, useState } from "react";
import {
  getInventoryStatusBreakdown,
  getLowStockItemsCount,
  getProductionOrdersStatusBreakdown,
  getProjectsStatusBreakdown,
  getPurchaseOrdersValueByStatus,
  IValueByStatus,
} from "../../../services/business-intelligence/analytics";
import { IStatusCount } from "../../../services/shared/dashboard";
import StatusBreakdownChart from "../../common/charts/StatusBreakdownChart";
import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const INVENTORY_LABELS = { ativo: "Ativo", descontinuado: "Descontinuado" };
const INVENTORY_COLORS = { ativo: "var(--chart-green)", descontinuado: "var(--chart-gray)" };

const PRODUCTION_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_producao: "Em produção",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
const PRODUCTION_COLORS: Record<string, string> = {
  pendente: "var(--chart-orange)",
  em_producao: "var(--chart-blue)",
  concluida: "var(--chart-green)",
  cancelada: "var(--color-danger)",
};

const PROJECT_LABELS: Record<string, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
const PROJECT_COLORS: Record<string, string> = {
  planejamento: "var(--chart-blue)",
  em_andamento: "var(--chart-orange)",
  concluido: "var(--chart-green)",
  cancelado: "var(--color-danger)",
};

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

export default function AnaliseDados() {
  const [inventoryBreakdown, setInventoryBreakdown] = useState<IStatusCount[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [productionBreakdown, setProductionBreakdown] = useState<IStatusCount[]>([]);
  const [projectsBreakdown, setProjectsBreakdown] = useState<IStatusCount[]>([]);
  const [purchaseOrdersValue, setPurchaseOrdersValue] = useState<IValueByStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getInventoryStatusBreakdown(),
      getLowStockItemsCount(),
      getProductionOrdersStatusBreakdown(),
      getProjectsStatusBreakdown(),
      getPurchaseOrdersValueByStatus(),
    ])
      .then(([inventory, lowStock, production, projects, purchaseOrders]) => {
        setInventoryBreakdown(inventory);
        setLowStockCount(lowStock);
        setProductionBreakdown(production);
        setProjectsBreakdown(projects);
        setPurchaseOrdersValue(purchaseOrders);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar análise")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="analytics_page">
      <h1>Análise de Dados</h1>

      {error && <p className="analytics_page__error">{error}</p>}

      {loading ? (
        <p className="analytics_page__empty">Carregando análise...</p>
      ) : (
        <>
          <div className="analytics_page__cards">
            <div
              className={`analytics_page__card ${
                lowStockCount > 0 ? "analytics_page__card--danger" : "analytics_page__card--success"
              }`}
            >
              <span>Itens em estoque baixo</span>
              <strong>{lowStockCount}</strong>
            </div>
          </div>

          <div className="analytics_page__charts">
            <StatusBreakdownChart
              title="Estoque por status"
              data={inventoryBreakdown}
              statusLabels={INVENTORY_LABELS}
              statusColors={INVENTORY_COLORS}
              barName="Itens"
            />
            <StatusBreakdownChart
              title="Ordens de produção por status"
              data={productionBreakdown}
              statusLabels={PRODUCTION_LABELS}
              statusColors={PRODUCTION_COLORS}
              barName="Ordens"
            />
            <StatusBreakdownChart
              title="Projetos por status"
              data={projectsBreakdown}
              statusLabels={PROJECT_LABELS}
              statusColors={PROJECT_COLORS}
              barName="Projetos"
            />
          </div>

          <div className="analytics_page__table_section">
            <h2>Compras por status (valor)</h2>
            <div className="analytics_page__table_wrap">
              <table className="analytics_page__table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrdersValue.map((row) => (
                    <tr key={row.status}>
                      <td>{PURCHASE_STATUS_LABEL[row.status] ?? row.status}</td>
                      <td>{currency.format(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
