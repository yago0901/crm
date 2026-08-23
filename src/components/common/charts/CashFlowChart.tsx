import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../ChartCard";
import ChartTooltip from "../ChartCard/ChartTooltip";
import { IMonthlyCashFlow } from "../../../services/finance";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const formatMonth = (key: string) => {
  if (key === "sem-data") return "Sem data";
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short" });
};

interface CashFlowChartProps {
  data: IMonthlyCashFlow[];
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData = data.map((m) => ({
    month: formatMonth(m.month),
    Receitas: m.receitas,
    Despesas: m.despesas,
  }));

  return (
    <ChartCard title="Fluxo de caixa mensal">
      {chartData.length === 0 ? (
        <div className="chart_card__empty">Sem contas cadastradas ainda.</div>
      ) : (
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
            <Legend
              wrapperStyle={{ fontSize: 12, color: "var(--color-text-muted)" }}
            />
            <Bar
              dataKey="Receitas"
              fill="var(--color-success)"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="Despesas"
              fill="var(--color-danger)"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
