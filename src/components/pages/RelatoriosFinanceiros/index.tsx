import { useEffect, useState } from "react";
import { getActiveContractsTotal } from "../../../services/contracts";
import { getPayablesOpenTotal, getReceivablesOpenTotal } from "../../../services/finance";
import { getLedgerBalance } from "../../../services/ledger";
import {
  getFinanceStatusBreakdown,
  getMonthlyCashFlow,
  IStatusCount,
} from "../../../services/dashboard";
import { IMonthlyCashFlow } from "../../../services/finance";
import CashFlowChart from "../../common/charts/CashFlowChart";
import FinanceStatusChart from "../../common/charts/FinanceStatusChart";
import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface IFinancialReportStats {
  totalAPagar: number;
  totalAReceber: number;
  saldoContabil: number;
  valorContratosAtivos: number;
}

export default function RelatoriosFinanceiros() {
  const [stats, setStats] = useState<IFinancialReportStats | null>(null);
  const [financeByStatus, setFinanceByStatus] = useState<IStatusCount[]>([]);
  const [cashFlow, setCashFlow] = useState<IMonthlyCashFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPayablesOpenTotal(),
      getReceivablesOpenTotal(),
      getLedgerBalance(),
      getActiveContractsTotal(),
      getFinanceStatusBreakdown(),
      getMonthlyCashFlow(),
    ])
      .then(
        ([
          totalAPagar,
          totalAReceber,
          saldoContabil,
          valorContratosAtivos,
          financeData,
          cashFlowData,
        ]) => {
          setStats({ totalAPagar, totalAReceber, saldoContabil, valorContratosAtivos });
          setFinanceByStatus(financeData);
          setCashFlow(cashFlowData);
        }
      )
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar relatórios")
      )
      .finally(() => setLoading(false));
  }, []);

  const saldoPrevisto = (stats?.totalAReceber ?? 0) - (stats?.totalAPagar ?? 0);

  return (
    <div className="finance_reports_page">
      <h1>Relatórios Financeiros</h1>

      {error && <p className="finance_reports_page__error">{error}</p>}

      {loading ? (
        <p className="finance_reports_page__empty">Carregando relatórios...</p>
      ) : (
        <>
          <div className="finance_reports_page__cards">
            <div className="finance_reports_page__card finance_reports_page__card--danger">
              <span>A pagar (em aberto)</span>
              <strong>{currency.format(stats?.totalAPagar ?? 0)}</strong>
            </div>
            <div className="finance_reports_page__card finance_reports_page__card--success">
              <span>A receber (em aberto)</span>
              <strong>{currency.format(stats?.totalAReceber ?? 0)}</strong>
            </div>
            <div
              className={`finance_reports_page__card ${
                saldoPrevisto >= 0
                  ? "finance_reports_page__card--success"
                  : "finance_reports_page__card--danger"
              }`}
            >
              <span>Saldo previsto (Pagar/Receber)</span>
              <strong>{currency.format(saldoPrevisto)}</strong>
            </div>
            <div
              className={`finance_reports_page__card ${
                (stats?.saldoContabil ?? 0) >= 0
                  ? "finance_reports_page__card--success"
                  : "finance_reports_page__card--danger"
              }`}
            >
              <span>Saldo contábil</span>
              <strong>{currency.format(stats?.saldoContabil ?? 0)}</strong>
            </div>
            <div className="finance_reports_page__card finance_reports_page__card--neutral">
              <span>Valor em contratos ativos</span>
              <strong>{currency.format(stats?.valorContratosAtivos ?? 0)}</strong>
            </div>
          </div>

          <div className="finance_reports_page__charts">
            <CashFlowChart data={cashFlow} />
            <FinanceStatusChart data={financeByStatus} />
          </div>
        </>
      )}
    </div>
  );
}
