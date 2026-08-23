import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../ChartCard";
import ChartTooltip from "../ChartCard/ChartTooltip";
import { IForecastMonth } from "../../../services/business-intelligence/forecasting";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const formatMonth = (key: string) => {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

interface TrendForecastChartProps {
  data: IForecastMonth[];
}

export default function TrendForecastChart({ data }: TrendForecastChartProps) {
  const chartData = data.map((m) => ({
    month: formatMonth(m.month),
    Receitas: m.receitas,
    Despesas: m.despesas,
    projected: m.projected,
  }));

  return (
    <ChartCard title="Projeção de fluxo de caixa (regressão linear)">
      {chartData.length === 0 ? (
        <div className="chart_card__empty">Sem histórico suficiente para projetar.</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(value) => currency.format(Number(value))}
              />
              <Tooltip
                cursor={{ fill: "var(--color-border-soft)" }}
                content={<ChartTooltip formatValue={(v) => currency.format(v)} />}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-muted)" }} />
              <Bar dataKey="Receitas" radius={[4, 4, 0, 0]} maxBarSize={20}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={`receitas-${i}`}
                    fill="var(--color-success)"
                    fillOpacity={entry.projected ? 0.45 : 1}
                  />
                ))}
              </Bar>
              <Bar dataKey="Despesas" radius={[4, 4, 0, 0]} maxBarSize={20}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={`despesas-${i}`}
                    fill="var(--color-danger)"
                    fillOpacity={entry.projected ? 0.45 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="chart_card__note">
            Meses com barras mais claras são projeção (regressão linear sobre o histórico), não dado real.
          </p>
        </>
      )}
    </ChartCard>
  );
}
