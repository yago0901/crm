import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../../../common/ChartCard";
import ChartTooltip from "../../../common/ChartCard/ChartTooltip";
import { IDepartmentPayroll } from "../../../../services/shared/dashboard";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

interface PayrollByDepartmentChartProps {
  data: IDepartmentPayroll[];
}

export default function PayrollByDepartmentChart({ data }: PayrollByDepartmentChartProps) {
  const chartData = data.slice(0, 8);

  return (
    <ChartCard title="Folha de pagamento por departamento">
      {chartData.length === 0 ? (
        <div className="chart_card__empty">Sem funcionários ativos ainda.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--color-border-soft)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => currency.format(Number(value))}
            />
            <YAxis
              type="category"
              dataKey="department"
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip
              cursor={{ fill: "var(--color-border-soft)" }}
              content={<ChartTooltip formatValue={(v) => currency.format(v)} />}
            />
            <Bar
              dataKey="total"
              name="Folha"
              fill="var(--chart-violet)"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
