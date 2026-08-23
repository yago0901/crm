import { useEffect, useMemo, useState } from "react";
import {
  getCashFlowSummary,
  subscribeToPayables,
  subscribeToReceivables,
} from "../../../services/financeiro/finance";
import { IPayable, IReceivable } from "../../../types/finance";
import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatMonth = (key: string) => {
  if (key === "sem-data") return "Sem data";
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

export default function FluxoCaixa() {
  const [payables, setPayables] = useState<IPayable[]>([]);
  const [receivables, setReceivables] = useState<IReceivable[]>([]);
  const [loadingPayables, setLoadingPayables] = useState(true);
  const [loadingReceivables, setLoadingReceivables] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPayables(
      "all",
      (data) => {
        setPayables(data);
        setLoadingPayables(false);
      },
      (err) => {
        setError(err.message);
        setLoadingPayables(false);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToReceivables(
      "all",
      (data) => {
        setReceivables(data);
        setLoadingReceivables(false);
      },
      (err) => {
        setError(err.message);
        setLoadingReceivables(false);
      }
    );
    return unsubscribe;
  }, []);

  const summary = useMemo(
    () => getCashFlowSummary(payables, receivables),
    [payables, receivables]
  );

  const loading = loadingPayables || loadingReceivables;

  return (
    <div className="cashflow_page">
      <h1>Fluxo de Caixa</h1>

      {error && <p className="cashflow_page__error">{error}</p>}

      {loading ? (
        <p className="cashflow_page__empty">Carregando fluxo de caixa...</p>
      ) : (
        <>
          <div className="cashflow_page__cards">
            <div className="cashflow_page__card cashflow_page__card--danger">
              <span>A pagar (em aberto)</span>
              <strong>{currency.format(summary.totalAPagar)}</strong>
            </div>
            <div className="cashflow_page__card cashflow_page__card--success">
              <span>A receber (em aberto)</span>
              <strong>{currency.format(summary.totalAReceber)}</strong>
            </div>
            <div
              className={`cashflow_page__card ${
                summary.saldoPrevisto >= 0
                  ? "cashflow_page__card--success"
                  : "cashflow_page__card--danger"
              }`}
            >
              <span>Saldo previsto</span>
              <strong>{currency.format(summary.saldoPrevisto)}</strong>
            </div>
          </div>

          <h2>Por mês (vencimento)</h2>
          {summary.months.length === 0 ? (
            <p className="cashflow_page__empty">
              Sem contas cadastradas em Contas a Pagar/Receber ainda.
            </p>
          ) : (
            <div className="cashflow_page__table_wrap">
              <table className="cashflow_page__table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Receitas</th>
                    <th>Despesas</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.months.map((month) => (
                    <tr key={month.month}>
                      <td className="cashflow_page__table__month">
                        {formatMonth(month.month)}
                      </td>
                      <td>{currency.format(month.receitas)}</td>
                      <td>{currency.format(month.despesas)}</td>
                      <td
                        className={
                          month.saldo >= 0
                            ? "cashflow_page__table__positive"
                            : "cashflow_page__table__negative"
                        }
                      >
                        {currency.format(month.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
