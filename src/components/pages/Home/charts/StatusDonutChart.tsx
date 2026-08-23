import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import ChartCard from "../../../common/ChartCard";
import ChartTooltip from "../../../common/ChartCard/ChartTooltip";
import { IStatusCount } from "../../../../services/shared/dashboard";
import "./StatusDonutChart.scss";

interface StatusDonutChartProps {
  title: string;
  totalLabel: string;
  data: IStatusCount[];
  labels: Record<string, string>;
  colors: Record<string, string>;
  emptyMessage: string;
}

export default function StatusDonutChart({
  title,
  totalLabel,
  data,
  labels,
  colors,
  emptyMessage,
}: StatusDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const chartData = data.map((d) => ({
    key: d.status,
    name: labels[d.status] ?? d.status,
    value: d.count,
    percent: total > 0 ? Math.round((d.count / total) * 100) : 0,
  }));

  return (
    <ChartCard title={title}>
      {total === 0 ? (
        <div className="chart_card__empty">{emptyMessage}</div>
      ) : (
        <div className="status_donut">
          <div className="status_donut__ring">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={colors[entry.key]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="status_donut__center">
              <strong>{total}</strong>
              <span>{totalLabel}</span>
            </div>
          </div>

          <ul className="status_donut__legend">
            {chartData.map((entry) => (
              <li key={entry.key}>
                <span
                  className="status_donut__legend__dot"
                  style={{ backgroundColor: colors[entry.key] }}
                />
                <span className="status_donut__legend__name">{entry.name}</span>
                <span className="status_donut__legend__percent">{entry.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
