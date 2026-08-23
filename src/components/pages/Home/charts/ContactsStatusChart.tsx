import StatusDonutChart from "./StatusDonutChart";
import { IStatusCount } from "../../../../services/shared/dashboard";

const STATUS_LABEL: Record<string, string> = {
  lead: "Lead",
  cliente: "Cliente",
  inativo: "Inativo",
};

const STATUS_COLOR: Record<string, string> = {
  lead: "var(--chart-orange)",
  cliente: "var(--chart-green)",
  inativo: "var(--chart-gray)",
};

interface ContactsStatusChartProps {
  data: IStatusCount[];
}

export default function ContactsStatusChart({ data }: ContactsStatusChartProps) {
  return (
    <StatusDonutChart
      title="Contatos por status"
      totalLabel="contatos"
      data={data}
      labels={STATUS_LABEL}
      colors={STATUS_COLOR}
      emptyMessage="Sem contatos cadastrados ainda."
    />
  );
}
