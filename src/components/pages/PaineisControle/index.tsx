import { useEffect, useState } from "react";
import {
  FaBoxOpen,
  FaCoins,
  FaExclamationTriangle,
  FaFileContract,
  FaHandshake,
  FaIndustry,
  FaProjectDiagram,
  FaUserCheck,
  FaUserClock,
} from "react-icons/fa";
import { getDashboardStats, IDashboardStats } from "../../../services/shared/dashboard";
import { getPayablesOpenTotal, getReceivablesOpenTotal } from "../../../services/financeiro/finance";
import { getLedgerBalance } from "../../../services/financeiro/ledger";
import { getActiveInventoryTotal } from "../../../services/estoques-logistica/inventory";
import { getLowStockItemsCount } from "../../../services/business-intelligence/analytics";
import { getPendingProductionOrdersCount } from "../../../services/producao-manufatura/productionOrders";
import { getActiveProjectsCount } from "../../../services/projetos/projects";
import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface IPanelStats {
  dashboard: IDashboardStats;
  payablesOpen: number;
  receivablesOpen: number;
  ledgerBalance: number;
  activeInventoryItems: number;
  lowStockItems: number;
  pendingProductionOrders: number;
  activeProjects: number;
}

export default function PaineisControle() {
  const [stats, setStats] = useState<IPanelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getPayablesOpenTotal(),
      getReceivablesOpenTotal(),
      getLedgerBalance(),
      getActiveInventoryTotal(),
      getLowStockItemsCount(),
      getPendingProductionOrdersCount(),
      getActiveProjectsCount(),
    ])
      .then(
        ([
          dashboard,
          payablesOpen,
          receivablesOpen,
          ledgerBalance,
          activeInventoryItems,
          lowStockItems,
          pendingProductionOrders,
          activeProjects,
        ]) => {
          setStats({
            dashboard,
            payablesOpen,
            receivablesOpen,
            ledgerBalance,
            activeInventoryItems,
            lowStockItems,
            pendingProductionOrders,
            activeProjects,
          });
        }
      )
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar painel")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="control_panel_page">
      <h1>Painéis de Controle</h1>

      {error && <p className="control_panel_page__error">{error}</p>}

      {loading ? (
        <p className="control_panel_page__empty">Carregando painel...</p>
      ) : (
        <div className="control_panel_page__cards">
          <div className="control_panel_page__card control_panel_page__card--amber">
            <div className="control_panel_page__card__icon">
              <FaUserClock />
            </div>
            <div className="control_panel_page__card__text">
              <span>Leads ativos</span>
              <strong>{stats?.dashboard.leadsCount ?? 0}</strong>
            </div>
          </div>

          <div className="control_panel_page__card control_panel_page__card--teal">
            <div className="control_panel_page__card__icon">
              <FaUserCheck />
            </div>
            <div className="control_panel_page__card__text">
              <span>Clientes</span>
              <strong>{stats?.dashboard.clientesCount ?? 0}</strong>
            </div>
          </div>

          <div className="control_panel_page__card control_panel_page__card--blue">
            <div className="control_panel_page__card__icon">
              <FaFileContract />
            </div>
            <div className="control_panel_page__card__text">
              <span>Contratos ativos</span>
              <strong>{stats?.dashboard.contratosAtivosCount ?? 0}</strong>
            </div>
          </div>

          <div className="control_panel_page__card control_panel_page__card--violet">
            <div className="control_panel_page__card__icon">
              <FaHandshake />
            </div>
            <div className="control_panel_page__card__text">
              <span>Valor em contratos ativos</span>
              <strong>{currency.format(stats?.dashboard.valorContratosAtivos ?? 0)}</strong>
            </div>
          </div>

          <div className="control_panel_page__card control_panel_page__card--danger">
            <div className="control_panel_page__card__icon">
              <FaCoins />
            </div>
            <div className="control_panel_page__card__text">
              <span>A pagar (em aberto)</span>
              <strong>{currency.format(stats?.payablesOpen ?? 0)}</strong>
            </div>
          </div>

          <div className="control_panel_page__card control_panel_page__card--teal">
            <div className="control_panel_page__card__icon">
              <FaCoins />
            </div>
            <div className="control_panel_page__card__text">
              <span>A receber (em aberto)</span>
              <strong>{currency.format(stats?.receivablesOpen ?? 0)}</strong>
            </div>
          </div>

          <div
            className={`control_panel_page__card ${
              (stats?.ledgerBalance ?? 0) >= 0
                ? "control_panel_page__card--teal"
                : "control_panel_page__card--danger"
            }`}
          >
            <div className="control_panel_page__card__icon">
              <FaCoins />
            </div>
            <div className="control_panel_page__card__text">
              <span>Saldo contábil</span>
              <strong>{currency.format(stats?.ledgerBalance ?? 0)}</strong>
            </div>
          </div>

          <div className="control_panel_page__card control_panel_page__card--blue">
            <div className="control_panel_page__card__icon">
              <FaBoxOpen />
            </div>
            <div className="control_panel_page__card__text">
              <span>Itens de estoque ativos</span>
              <strong>{stats?.activeInventoryItems ?? 0}</strong>
            </div>
          </div>

          <div
            className={`control_panel_page__card ${
              (stats?.lowStockItems ?? 0) > 0
                ? "control_panel_page__card--danger"
                : "control_panel_page__card--teal"
            }`}
          >
            <div className="control_panel_page__card__icon">
              <FaExclamationTriangle />
            </div>
            <div className="control_panel_page__card__text">
              <span>Itens em estoque baixo</span>
              <strong>{stats?.lowStockItems ?? 0}</strong>
            </div>
          </div>

          <div className="control_panel_page__card control_panel_page__card--amber">
            <div className="control_panel_page__card__icon">
              <FaIndustry />
            </div>
            <div className="control_panel_page__card__text">
              <span>Ordens de produção pendentes</span>
              <strong>{stats?.pendingProductionOrders ?? 0}</strong>
            </div>
          </div>

          <div className="control_panel_page__card control_panel_page__card--violet">
            <div className="control_panel_page__card__icon">
              <FaProjectDiagram />
            </div>
            <div className="control_panel_page__card__text">
              <span>Projetos em andamento</span>
              <strong>{stats?.activeProjects ?? 0}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
