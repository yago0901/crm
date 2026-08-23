import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../ChartCard";
import ChartTooltip from "../ChartCard/ChartTooltip";
import { IStatusCount } from "../../../services/shared/dashboard";

interface StatusBreakdownChartProps {
  title: string;
  data: IStatusCount[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  barName?: string;
}

export default function StatusBreakdownChart({
  title,
  data,
  statusLabels,
  statusColors,
  barName = "Total",
}: StatusBreakdownChartProps) {
  const chartData = data.map((d) => ({
    status: statusLabels[d.status] ?? d.status,
    key: d.status,
    count: d.count,
  }));

  const isEmpty = chartData.every((d) => d.count === 0);

  return (
    <ChartCard title={title}>
      {isEmpty ? (
        <div className="chart_card__empty">Sem dados cadastrados ainda.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
            <XAxis
              dataKey="status"
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "var(--color-border-soft)" }}
              content={<ChartTooltip />}
            />
            <Bar dataKey="count" name={barName} radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={statusColors[entry.key] ?? "var(--chart-gray)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
