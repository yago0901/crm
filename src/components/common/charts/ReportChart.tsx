import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../ChartCard";
import ChartTooltip from "../ChartCard/ChartTooltip";
import { IReportGroup } from "../../../services/business-intelligence/reports";

const PALETTE = [
  "var(--chart-blue, #3b82f6)",
  "var(--chart-green, #22c55e)",
  "var(--chart-orange, #f97316)",
  "var(--color-primary, #6366f1)",
  "var(--color-danger, #ef4444)",
  "var(--chart-teal, #14b8a6)",
  "var(--chart-purple, #a855f7)",
  "var(--chart-yellow, #eab308)",
];

interface ReportChartProps {
  title: string;
  type: "bar" | "pie";
  data: IReportGroup[];
}

export default function ReportChart({ title, type, data }: ReportChartProps) {
  const chartData = data.slice(0, 20);

  return (
    <ChartCard title={title}>
      {chartData.length === 0 ? (
        <div className="chart_card__empty">Sem dados para o gráfico.</div>
      ) : type === "pie" ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="key" outerRadius="80%" label>
              {chartData.map((entry, index) => (
                <Cell key={entry.key} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
            <XAxis
              dataKey="key"
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip cursor={{ fill: "var(--color-border-soft)" }} content={<ChartTooltip />} />
            <Bar dataKey="value" name="Valor" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, index) => (
                <Cell key={entry.key} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
