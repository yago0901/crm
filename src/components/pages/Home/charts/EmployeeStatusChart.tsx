import StatusDonutChart from "./StatusDonutChart";
import { IStatusCount } from "../../../../services/shared/dashboard";

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  ferias: "Férias",
  desligado: "Desligado",
};

const STATUS_COLOR: Record<string, string> = {
  ativo: "var(--chart-green)",
  ferias: "var(--chart-orange)",
  desligado: "var(--chart-gray)",
};

interface EmployeeStatusChartProps {
  data: IStatusCount[];
}

export default function EmployeeStatusChart({ data }: EmployeeStatusChartProps) {
  return (
    <StatusDonutChart
      title="Funcionários por status"
      totalLabel="funcionários"
      data={data}
      labels={STATUS_LABEL}
      colors={STATUS_COLOR}
      emptyMessage="Sem funcionários cadastrados ainda."
    />
  );
}
