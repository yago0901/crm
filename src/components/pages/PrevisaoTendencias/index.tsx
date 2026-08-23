import { useEffect, useState } from "react";
import { getCashFlowForecast, IForecastMonth } from "../../../services/business-intelligence/forecasting";
import TrendForecastChart from "../../common/charts/TrendForecastChart";
import "./styles.scss";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatMonth = (key: string) => {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

export default function PrevisaoTendencias() {
  const [forecast, setForecast] = useState<IForecastMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCashFlowForecast(2)
      .then(setForecast)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao calcular projeção")
      )
      .finally(() => setLoading(false));
  }, []);

  const projectedMonths = forecast.filter((m) => m.projected);

  return (
    <div className="forecast_page">
      <h1>Previsão de Tendências</h1>

      {error && <p className="forecast_page__error">{error}</p>}

      {loading ? (
        <p className="forecast_page__empty">Calculando projeção...</p>
      ) : forecast.length === 0 ? (
        <p className="forecast_page__empty">
          Sem histórico suficiente em Contas a Pagar/Receber para projetar uma tendência.
        </p>
      ) : (
        <>
          <div className="forecast_page__cards">
            {projectedMonths.map((month) => (
              <div
                key={month.month}
                className={`forecast_page__card ${
                  month.saldo >= 0 ? "forecast_page__card--success" : "forecast_page__card--danger"
                }`}
              >
                <span>Saldo projetado — {formatMonth(month.month)}</span>
                <strong>{currency.format(month.saldo)}</strong>
              </div>
            ))}
          </div>

          <div className="forecast_page__chart">
            <TrendForecastChart data={forecast} />
          </div>
        </>
      )}
    </div>
  );
}
