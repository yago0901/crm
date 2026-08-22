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
import ChartCard from "../../../common/ChartCard";
import ChartTooltip from "../../../common/ChartCard/ChartTooltip";
import { IStatusCount } from "../../../../services/dashboard";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  rascunho: "var(--chart-gray)",
  ativo: "var(--chart-blue)",
  encerrado: "var(--color-info-text)",
  cancelado: "var(--color-danger)",
};

interface ContractsStatusChartProps {
  data: IStatusCount[];
}

export default function ContractsStatusChart({ data }: ContractsStatusChartProps) {
  const chartData = data.map((d) => ({
    status: STATUS_LABEL[d.status] ?? d.status,
    key: d.status,
    count: d.count,
  }));

  const isEmpty = chartData.every((d) => d.count === 0);

  return (
    <ChartCard title="Contratos por status">
      {isEmpty ? (
        <div className="chart_card__empty">Sem contratos cadastrados ainda.</div>
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
            <Bar dataKey="count" name="Contratos" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLOR[entry.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
